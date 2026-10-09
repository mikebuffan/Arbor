import { describe, expect, it, vi } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import { runOpenAIAgencyAgent } from "../openaiAgent";
import { AgencyToolRegistry } from "../tools";

const unexpectedLiveProvider = vi.hoisted(() => vi.fn(() => {
  throw new Error("unexpected_live_provider");
}));
vi.mock("@/lib/providers/openai", () => ({
  openai: { responses: { create: unexpectedLiveProvider } },
}));

const context = { userId: "synthetic-owner", projectId: "synthetic-project",
  conversationId: "synthetic-conversation", turnId: "synthetic-turn" };

const mock = (id: string, status: string, text: string, output: unknown[] = []): Response => ({
  id, status, model: "offline-fake-model", output_text: text,
  output, usage: null,
} as unknown as Response);

function fixture() {
  const called = vi.fn(async () => ({ inspected: true }));
  const tools = new AgencyToolRegistry();
  tools.register({ name: "inspect_fixture", description: "Read a synthetic fixture.",
    risk: "read", parameters: { type: "object", properties: {},
      required: [], additionalProperties: false }, execute: called });
  return { tools, called };
}

describe("Actual chat agent loop: provider completion boundaries (synthetic provider only)", () => {
  it.each(["incomplete", "failed", "cancelled", "queued", "in_progress"])(
    "never calls complete on explicitly %s provider output even with persuasive text", async status => {
      const { tools, called } = fixture();
      const onComplete = vi.fn(async () => {});
      const createResponse = vi.fn(async () => mock("unaccepted", status, "Everything is finished."));
      const result = await runOpenAIAgencyAgent({
        instructions: "Synthetic no-op", userText: "Answer this", tools, context,
        responseCreate: createResponse, verifyCompletion: false,
        hooks: { onComplete },
      });
      expect(result.status).toBe("checkpointed");
      expect(createResponse).toHaveBeenCalledOnce();
      expect(onComplete).not.toHaveBeenCalled();
      expect(called).not.toHaveBeenCalled();
      expect(unexpectedLiveProvider).not.toHaveBeenCalled();
    },
  );

  it("does not execute a function call from an explicitly unfinished provider response", async () => {
    const { tools, called } = fixture();
    const output = [{ type: "function_call", call_id: "unsafe-call",
      name: "inspect_fixture", arguments: "{}" }];
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic no-op", userText: "Inspect the fixture", tools, context,
      responseCreate: async () => mock("unfinished-tools", "incomplete", "", output),
      verifyCompletion: false,
    });
    expect(result.status).toBe("checkpointed");
    expect(called).not.toHaveBeenCalled();
  });

  it("does not convert a completed empty response into a successful final answer", async () => {
    const { tools } = fixture();
    const onComplete = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic no-op", userText: "Answer this", tools, context,
      responseCreate: async () => mock("blank", "completed", "   "),
      verifyCompletion: false, hooks: { onComplete },
    });
    expect(result.status).toBe("checkpointed");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("rejects malformed response output without executing tools or marking complete", async () => {
    const { tools, called } = fixture();
    const onComplete = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic no-op", userText: "Answer this", tools, context,
      responseCreate: async () => ({
        ...mock("malformed", "completed", "Done"),
        output: null,
      }) as unknown as Response,
      verifyCompletion: false, hooks: { onComplete },
    });
    expect(result.status).toBe("checkpointed");
    expect(called).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("still accepts a completed nonempty provider response in the no-verifier fixture", async () => {
    const { tools } = fixture();
    const onComplete = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic no-op", userText: "Answer this", tools, context,
      responseCreate: async () => mock("valid", "completed", "Actual answer"),
      verifyCompletion: false, hooks: { onComplete },
    });
    expect(result.status).toBe("complete");
    if (result.status === "complete") expect(result.text).toBe("Actual answer");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("retains checkpoint after a prior successful read and then incomplete provider response", async () => {
    const { tools, called } = fixture();
    let calls = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic read only", userText: "Inspect the fixture", tools, context,
      responseCreate: async () => ++calls === 1
        ? mock("read-call", "completed", "", [{
            type: "function_call", call_id: "read", name: "inspect_fixture", arguments: "{}",
          }])
        : mock("not-complete", "incomplete", "It is all finished."),
      verifyCompletion: false,
    });
    expect(result.status).toBe("checkpointed");
    expect(called).toHaveBeenCalledOnce();
    expect(calls).toBe(2);
  });

  it.each([0, -1, 0.5, 129, Infinity, NaN, Number.MAX_SAFE_INTEGER])(
    "rejects invalid model-round limit %s before any model or tool call", async maxRounds => {
      const { tools, called } = fixture();
      const createResponse = vi.fn(async () => mock("should-not-request", "completed", "Oops"));
      const onComplete = vi.fn(async () => {});
      await expect(runOpenAIAgencyAgent({
        instructions: "Synthetic bounded model only",
        userText: "Continue safely", tools, context,
        responseCreate: createResponse, verifyCompletion: false,
        maxRounds, hooks: { onComplete },
      })).rejects.toThrow("agency_invalid_round_budget");
      expect(createResponse).not.toHaveBeenCalled();
      expect(called).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    },
  );

  it("still accepts the smallest valid round budget for a complete reply", async () => {
    const { tools } = fixture();
    const model = vi.fn(async () => mock("one-round", "completed", "Done once."));
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic one-round model",
      userText: "Answer briefly", tools, context,
      responseCreate: model, verifyCompletion: false, maxRounds: 1,
    });
    expect(result.status).toBe("complete");
    expect(model).toHaveBeenCalledOnce();
  });

  it("rejects a malformed second call before executing the first eligible tool", async () => {
    const { tools, called } = fixture();
    const onComplete = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic tool-call safety", userText: "Inspect",
      tools, context, verifyCompletion: false,
      responseCreate: async () => mock("mixed", "completed", "", [
        { type: "function_call", call_id: "first", name: "inspect_fixture", arguments: "{}" },
        { type: "function_call", call_id: "second", name: "inspect_fixture", arguments: "{bad-json" },
      ]), hooks: { onComplete },
    });
    expect(result.status).toBe("checkpointed");
    expect(called).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it.each([
    ["duplicate", [
      { type: "function_call", call_id: "same", name: "inspect_fixture", arguments: "{}" },
      { type: "function_call", call_id: "same", name: "inspect_fixture", arguments: "{}" },
    ]],
    ["unknown name", [
      { type: "function_call", call_id: "first", name: "inspect_fixture", arguments: "{}" },
      { type: "function_call", call_id: "second", name: "nonexistent_tool", arguments: "{}" },
    ]],
    ["missing call identifier", [
      { type: "function_call", name: "inspect_fixture", arguments: "{}" },
    ]],
    ["nonobject arguments", [
      { type: "function_call", call_id: "wrong-args", name: "inspect_fixture", arguments: "[]" },
    ]],
  ])("rejects %s provider tool calls atomically", async (_label, output) => {
    const { tools, called } = fixture();
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic tool-call safety", userText: "Inspect",
      tools, context, verifyCompletion: false,
      responseCreate: async () => mock("invalid-batch", "completed", "", output as unknown[]),
    });
    expect(result.status).toBe("checkpointed");
    expect(called).not.toHaveBeenCalled();
  });

  it("rejects an excessive provider tool batch before running any action", async () => {
    const { tools, called } = fixture();
    const output = Array.from({ length: 25 }, (_, i) => ({
      type: "function_call", call_id: "item-" + i,
      name: "inspect_fixture", arguments: "{}",
    }));
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic bounded tools", userText: "Inspect",
      tools, context, verifyCompletion: false,
      responseCreate: async () => mock("batch-too-large", "completed", "", output),
    });
    expect(result.status).toBe("checkpointed");
    expect(called).not.toHaveBeenCalled();
  });

  it("still runs a small well-formed multi-tool batch and returns actual readback", async () => {
    const { tools, called } = fixture();
    let requests = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic authorized read only", userText: "Inspect twice",
      tools, context, verifyCompletion: false,
      responseCreate: async () => ++requests === 1
        ? mock("good-batch", "completed", "", [
          { type: "function_call", call_id: "one", name: "inspect_fixture", arguments: "{}" },
          { type: "function_call", call_id: "two", name: "inspect_fixture", arguments: "{}" },
        ])
        : mock("good-result", "completed", "Two reads were recorded."),
    });
    expect(result.status).toBe("complete");
    expect(called).toHaveBeenCalledTimes(2);
    expect(requests).toBe(2);
  });
});
