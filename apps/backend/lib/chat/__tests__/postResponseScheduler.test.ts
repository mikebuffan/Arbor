import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CHAT_POST_RESPONSE_TASKS,
  scheduleChatPostResponseWork,
  type ChatPostResponseOperations,
  type ContinuationRegistrar,
} from "@/lib/chat/postResponseScheduler";

function operations(overrides: Partial<ChatPostResponseOperations> = {}) {
  return {
    telemetry: vi.fn().mockResolvedValue(undefined),
    memory_pipeline: vi.fn().mockResolvedValue(undefined),
    conversation_update: vi.fn().mockResolvedValue(undefined),
    decision_outcome: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("chat post-response lifecycle scheduler", () => {
  it("registers all operations without waiting for them before returning", async () => {
    let continuation: (() => Promise<void>) | null = null;
    let releaseMemory: (() => void) | null = null;
    const memoryPending = new Promise<void>((resolve) => {
      releaseMemory = resolve;
    });
    const work = operations({
      memory_pipeline: vi.fn(() => memoryPending),
    });
    const register: ContinuationRegistrar = (callback) => {
      continuation = callback;
    };

    expect(
      scheduleChatPostResponseWork({
        newlyCreated: true,
        operations: work,
        registerContinuation: register,
      }),
    ).toBe(true);
    expect(continuation).not.toBeNull();
    for (const name of CHAT_POST_RESPONSE_TASKS) {
      expect(work[name]).not.toHaveBeenCalled();
    }

    const lifecycle = continuation!();
    await vi.waitFor(() => {
      expect(work.memory_pipeline).toHaveBeenCalledTimes(1);
    });
    for (const name of CHAT_POST_RESPONSE_TASKS) {
      expect(work[name]).toHaveBeenCalledTimes(1);
    }
    releaseMemory!();
    await lifecycle;
  });

  it("attempts every operation when one fails and redacts the failure", async () => {
    const privateError = Object.assign(
      new Error("private prompt and bearer token"),
      { code: "42501", details: { content: "private message" } },
    );
    const work = operations({
      memory_pipeline: vi.fn().mockRejectedValue(privateError),
    });
    let continuation: (() => Promise<void>) | null = null;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    scheduleChatPostResponseWork({
      newlyCreated: true,
      operations: work,
      registerContinuation: (callback) => {
        continuation = callback;
      },
    });
    await continuation!();

    for (const name of CHAT_POST_RESPONSE_TASKS) {
      expect(work[name]).toHaveBeenCalledTimes(1);
    }
    expect(warn).toHaveBeenCalledWith("[post-response] operation failed", {
      subsystem: "chat",
      operation: "memory_pipeline",
      code: "42501",
    });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain("private prompt");
    expect(logged).not.toContain("bearer token");
    expect(logged).not.toContain("private message");
    warn.mockRestore();
  });

  it("schedules telemetry and decision work exactly once only for a new turn", async () => {
    const work = operations();
    const continuations: Array<() => Promise<void>> = [];
    const register: ContinuationRegistrar = (callback) => {
      continuations.push(callback);
    };

    expect(
      scheduleChatPostResponseWork({
        newlyCreated: true,
        operations: work,
        registerContinuation: register,
      }),
    ).toBe(true);
    expect(
      scheduleChatPostResponseWork({
        newlyCreated: false,
        operations: work,
        registerContinuation: register,
      }),
    ).toBe(false);
    expect(continuations).toHaveLength(1);

    await continuations[0]();
    expect(work.telemetry).toHaveBeenCalledTimes(1);
    expect(work.decision_outcome).toHaveBeenCalledTimes(1);
    expect(work.memory_pipeline).toHaveBeenCalledTimes(1);
    expect(work.conversation_update).toHaveBeenCalledTimes(1);
  });

  it("routes chat work through Next.js lifecycle continuation, not runBg", () => {
    const route = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/chat/route.ts"),
      "utf8",
    );

    expect(route).toContain("scheduleChatPostResponseWork({");
    expect(route).toContain("newlyCreated: finalAssistant.created");
    expect(route).not.toContain("function runBg");
    expect(route).not.toContain("void fn().catch");
  });
});
