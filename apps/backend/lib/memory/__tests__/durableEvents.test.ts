import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_COMPLETED_PERSISTENCE_ERROR_CODE,
  writeDurableChatCompletedEvent,
} from "@/lib/memory/durableEvents";
import {
  scheduleChatPostResponseWork,
  type ChatPostResponseOperations,
  type ContinuationRegistrar,
} from "@/lib/chat/postResponseScheduler";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function supabaseWithInsert(
  insert: ReturnType<typeof vi.fn>,
): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("memory_pending");
      return { insert };
    }),
  } as unknown as SupabaseClient;
}

function operations(
  memoryPipeline: ChatPostResponseOperations["memory_pipeline"],
  overrides: Partial<ChatPostResponseOperations> = {},
): ChatPostResponseOperations {
  return {
    telemetry: vi.fn().mockResolvedValue(undefined),
    memory_pipeline: memoryPipeline,
    conversation_update: vi.fn().mockResolvedValue(undefined),
    decision_outcome: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("durable chat_completed events", () => {
  it("awaits the request-scoped insert and uses only the live Firefly columns", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T18:00:00.000Z"));
    const pending = deferred<{ error: null }>();
    const insert = vi.fn().mockReturnValue(pending.promise);
    const supabase = supabaseWithInsert(insert);
    let settled = false;

    const write = writeDurableChatCompletedEvent({
      supabase,
      userId: USER_ID,
      projectId: PROJECT_ID,
      conversationId: CONVERSATION_ID,
    }).finally(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      project_id: PROJECT_ID,
      question: "",
      ops: {},
      memory_key: null,
      event_type: "chat_completed",
      payload: { conversation_id: CONVERSATION_ID },
      created_at: "2026-09-05T18:00:00.000Z",
    });
    expect(Object.keys(insert.mock.calls[0][0]).sort()).toEqual(
      [
        "user_id",
        "project_id",
        "question",
        "ops",
        "memory_key",
        "event_type",
        "payload",
        "created_at",
      ].sort(),
    );

    pending.resolve({ error: null });
    await write;
    expect(settled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces returned and thrown provider failures as one bounded diagnostic", async () => {
    const privateFailure = {
      code: "42501",
      message: "private prompt and bearer token",
      details: "private message",
    };
    const returnedFailure = supabaseWithInsert(
      vi.fn().mockResolvedValue({ error: privateFailure }),
    );
    const thrownFailure = supabaseWithInsert(
      vi.fn().mockRejectedValue(privateFailure),
    );

    for (const supabase of [returnedFailure, thrownFailure]) {
      const rejection = await writeDurableChatCompletedEvent({
        supabase,
        userId: USER_ID,
        projectId: PROJECT_ID,
        conversationId: CONVERSATION_ID,
      }).catch((error: unknown) => error);

      expect(rejection).toMatchObject({
        name: "ChatCompletedPersistenceError",
        message: CHAT_COMPLETED_PERSISTENCE_ERROR_CODE,
        code: CHAT_COMPLETED_PERSISTENCE_ERROR_CODE,
      });
      const serialized = JSON.stringify(rejection);
      expect(serialized).not.toContain("42501");
      expect(serialized).not.toContain("private prompt");
      expect(serialized).not.toContain("bearer token");
      expect(serialized).not.toContain("private message");
    }
  });

  it("lets sibling continuation operations finish when the durable insert fails", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { message: "private database failure" },
    });
    const supabase = supabaseWithInsert(insert);
    const work = operations(() =>
      writeDurableChatCompletedEvent({
        supabase,
        userId: USER_ID,
        projectId: PROJECT_ID,
        conversationId: CONVERSATION_ID,
      }),
    );
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

    expect(insert).toHaveBeenCalledTimes(1);
    expect(work.telemetry).toHaveBeenCalledTimes(1);
    expect(work.conversation_update).toHaveBeenCalledTimes(1);
    expect(work.decision_outcome).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[post-response] operation failed", {
      subsystem: "chat",
      operation: "memory_pipeline",
      code: CHAT_COMPLETED_PERSISTENCE_ERROR_CODE,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      "private database failure",
    );
  });

  it("writes five new turns once each and skips the same-turn retry without timers", async () => {
    vi.useFakeTimers();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = supabaseWithInsert(insert);
    const continuations: Array<() => Promise<void>> = [];
    const registerContinuation: ContinuationRegistrar = (callback) => {
      continuations.push(callback);
    };

    for (let index = 0; index < 5; index += 1) {
      const work = operations(() =>
        writeDurableChatCompletedEvent({
          supabase,
          userId: USER_ID,
          projectId: PROJECT_ID,
          conversationId: `${CONVERSATION_ID.slice(0, -1)}${index}`,
        }),
      );
      expect(
        scheduleChatPostResponseWork({
          newlyCreated: true,
          operations: work,
          registerContinuation,
        }),
      ).toBe(true);
    }

    const retryMemoryPipeline = vi.fn(() =>
      writeDurableChatCompletedEvent({
        supabase,
        userId: USER_ID,
        projectId: PROJECT_ID,
        conversationId: CONVERSATION_ID,
      }),
    );
    const retryWork = operations(retryMemoryPipeline);
    expect(
      scheduleChatPostResponseWork({
        newlyCreated: false,
        operations: retryWork,
        registerContinuation,
      }),
    ).toBe(false);

    await Promise.all(continuations.map((continuation) => continuation()));

    expect(continuations).toHaveLength(5);
    expect(insert).toHaveBeenCalledTimes(5);
    expect(retryMemoryPipeline).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the route on the dedicated request client without service-role overlap", () => {
    const route = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/chat/route.ts"),
      "utf8",
    );
    const writer = fs.readFileSync(
      path.resolve(process.cwd(), "lib/memory/durableEvents.ts"),
      "utf8",
    );

    expect(route).toContain("await writeDurableChatCompletedEvent({");
    expect(route).toContain("supabase,");
    expect(route).not.toContain("@/lib/supabase/admin");
    expect(route).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(writer).toContain('import "server-only"');
    expect(writer).toContain("SupabaseClient");
    expect(writer).not.toContain("supabaseAdmin");
    expect(writer).not.toContain("createClient");
    expect(writer).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(writer).not.toContain("setTimeout");
    expect(writer).not.toContain("logMemoryEvent");
  });
});
