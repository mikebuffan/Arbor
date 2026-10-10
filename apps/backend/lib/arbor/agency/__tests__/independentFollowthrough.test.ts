import { describe, expect, it, vi } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import { AgencyToolRegistry } from "../tools";
import { runOpenAIAgencyAgent } from "../openaiAgent";

const unexpectedLiveProvider = vi.hoisted(() => vi.fn(() => {
  throw new Error("unexpected_live_provider");
}));
vi.mock("@/lib/providers/openai", () => ({
  openai: { responses: { create: unexpectedLiveProvider } },
}));

const context = {
  userId: "synthetic-owner", projectId: "synthetic-project",
  conversationId: "synthetic-conversation", turnId: "synthetic-turn",
};
type State = "completed" | "unfinished" | "blocked";
function fixture(options: { independentlyRunnableSafeAction?: boolean } = {}) {
  const tasks: Record<string, State> = {
    alreadyDone: "completed", safeFirst: "unfinished",
    safeSecond: "unfinished", needsApproval: "blocked",
  };
  const writes: string[] = [];
  const tools = new AgencyToolRegistry();
  tools.register({
    name: "inspect_fixture", risk: "read",
    description: "Inspect the synthetic task statuses and do not change anything.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: async () => ({ tasks: { ...tasks } }),
  });
  tools.register({
    name: "complete_fixture_task", risk: "reversible_write",
    mayRunBeforeProtectedBoundary: options.independentlyRunnableSafeAction ?? false,
    description: "Finish one permitted unfinished synthetic task, never a blocked or completed task.",
    parameters: { type: "object", properties: { task: { type: "string" } },
      required: ["task"], additionalProperties: false },
    execute: async ({ task }) => {
      const id = String(task);
      if (tasks[id] !== "unfinished") throw Error("fixture_task_not_eligible");
      tasks[id] = "completed";
      writes.push(id);
      return { task: id, completed: true };
    },
  });
  tools.register({
    name: "publish_fixture", risk: "high_consequence",
    description: "Synthetic action requiring owner review.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: async () => { writes.push("unsafe-publish"); return { published: true }; },
  });
  return { tasks, writes, tools };
}
function toolCall(id: string, name: string, args: Record<string, unknown> = {}): Response {
  return {
    id, model: "offline-fake-model", status: "completed", output_text: "", usage: null,
    output: [{ type: "function_call", call_id: id, name, arguments: JSON.stringify(args) }],
  } as unknown as Response;
}
function textReply(id: string, content: string): Response {
  return { id, model: "offline-fake-model", status: "completed",
    output_text: content, output: [], usage: null } as unknown as Response;
}

describe("Independent initiative follow-through: synthetic transport, not a real model score", () => {
  it("does not label unsupported model/verifier assertions as a host-observed outcome", async () => {
    const { tools } = fixture();
    const onVerification = vi.fn(async () => {});
    const verified = JSON.stringify({
      complete: true, score: 0.95, unresolvedWork: [],
      evidence: ["the model says tests passed"],
      strategyCorrection: "claim success confidently", behaviorViolations: [],
    });
    let calls = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Do not mistake a statement for an execution receipt.",
      userText: "Finish the example task.", tools, context,
      verifyCompletion: true,
      priorActionEvidence: ["an unverified previous claim"],
      responseCreate: async () => ++calls === 1
        ? textReply("candidate-without-action", "I completed the task.")
        : textReply("verifier-assertion", verified),
      hooks: { onVerification },
    });
    expect(result.status).toBe("complete");
    expect(onVerification).toHaveBeenCalledOnce();
    expect(onVerification).toHaveBeenCalledWith(expect.objectContaining({
      complete: true,
      hostObservedToolResult: false,
    }));
  });

  it("distinguishes a real host-returned tool result from unsupported model text", async () => {
    const { tools, writes } = fixture();
    const onVerification = vi.fn(async () => {});
    const verified = JSON.stringify({
      complete: true, score: 0.95, unresolvedWork: [],
      evidence: ["action completed"], strategyCorrection: null,
      behaviorViolations: [],
    });
    let calls = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Observe the actual result of the permitted action.",
      userText: "Finish the eligible task.", tools, context,
      verifyCompletion: true,
      responseCreate: async () => {
        calls++;
        if (calls === 1) return toolCall("candidate-tool-call", "complete_fixture_task", {task: "safeFirst"});
        if (calls === 2) return textReply("candidate-after-tool", "The safe task completed.");
        return textReply("verifier-after-tool", verified);
      },
      hooks: { onVerification },
    });
    expect(result.status).toBe("complete");
    expect(writes).toEqual(["safeFirst"]);
    expect(onVerification).toHaveBeenCalledWith(expect.objectContaining({
      complete: true,
      hostObservedToolResult: true,
    }));
  });

  it.each([false, true])("checkpoints an already-owned write before a provider can claim it finished (verifier=%s)", async verifyCompletion => {
    const { writes, tools } = fixture();
    const onComplete = vi.fn(async () => {});
    const onToolResult = vi.fn(async () => {});
    const complete = vi.fn(async () => {});
    let requests = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Only report completion with a saved action result.",
      userText: "Finish the eligible task.", tools, context,
      responseCreate: async () => ++requests === 1
        ? toolCall("pending-write", "complete_fixture_task", { task: "safeFirst" })
        : textReply("premature-final", "The task is finished."),
      verifyCompletion,
      idempotency: { claim: async () => ({ acquired: false, result: null }), complete },
      hooks: { onComplete, onToolResult },
    });
    expect(result.status).toBe("checkpointed");
    expect(requests).toBe(1);
    expect(writes).toEqual([]);
    expect(complete).not.toHaveBeenCalled();
    expect(onToolResult).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("reconciles an uncertain saved result without repeating the action on restart", async () => {
    const { writes, tools } = fixture();
    let saved: { acquired: false; result: unknown } | null = null;
    const onComplete = vi.fn(async () => {});
    const idempotency = {
      claim: async () => {
        if (saved) return saved;
        saved = { acquired: false, result: null };
        return { acquired: true as const, result: null };
      },
      complete: async () => { throw new Error("synthetic_result_save_failed"); },
    };
    const run = () => {
      let requests = 0;
      return runOpenAIAgencyAgent({
        instructions: "Same authorized action and request identity after restart.",
        userText: "Finish the eligible task.", tools, context, idempotency,
        verifyCompletion: false, hooks: { onComplete },
        responseCreate: async () => ++requests === 1
          ? toolCall("retry-write", "complete_fixture_task", { task: "safeFirst" })
          : textReply("final", "The action result is saved."),
      });
    };
    await expect(run()).rejects.toThrow("synthetic_result_save_failed");
    expect(writes).toEqual(["safeFirst"]);
    expect(onComplete).not.toHaveBeenCalled();
    expect((await run()).status).toBe("checkpointed");
    expect(writes).toEqual(["safeFirst"]);
    expect(onComplete).not.toHaveBeenCalled();
    // A trusted owning execution reconciles its receipt; a retry cannot do so
    // merely because the provider says the action is finished.
    saved = { acquired: false, result: { task: "safeFirst", completed: true } };
    expect((await run()).status).toBe("complete");
    expect(writes).toEqual(["safeFirst"]);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("inspects, finishes two eligible tasks, skips completed/blocked work, and finishes within one user turn", async () => {
    unexpectedLiveProvider.mockClear();
    const { tasks, writes, tools } = fixture();
    let calls = 0;
    const chosen: string[] = [];
    const fakeTransport = vi.fn(async (request: any): Promise<Response> => {
      const id = "fixture-response-" + ++calls;
      if (!request.previous_response_id) return toolCall(id, "inspect_fixture");
      const outputs = request.input as { type: string; output: string }[];
      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("function_call_output");
      const receipt = JSON.parse(outputs[0].output) as {
        ok: boolean; result: { tasks?: Record<string, State> };
      };
      expect(receipt.ok).toBe(true);
      if (receipt.result.tasks) {
        // Fake chooser deliberately derives next step from the *observed*
        // state rather than from a hardcoded sequence. This only proves
        // runtime chaining; a model's initiative remains unmeasured.
        const next = Object.entries(receipt.result.tasks)
          .find(([task, state]) => task !== "needsApproval" && state === "unfinished");
        return next ? toolCall(id, "complete_fixture_task", { task: next[0] })
          : textReply(id, "The eligible tasks are complete; restricted work remains blocked.");
      }
      return toolCall(id, "inspect_fixture");
    });
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic authorized reversible work only.",
      userText: "Finish the eligible tasks without asking for repeated go messages.",
      responseCreate: fakeTransport, tools, context,
      maxRounds: 12, verifyCompletion: false,
      hooks: { onToolSelected: async event => { chosen.push(event.name); } },
    });
    expect(result.status).toBe("complete");
    expect(result.toolCalls).toBe(5);
    expect(calls).toBe(6);
    expect(chosen).toEqual([
      "inspect_fixture", "complete_fixture_task", "inspect_fixture",
      "complete_fixture_task", "inspect_fixture",
    ]);
    expect(writes).toEqual(["safeFirst", "safeSecond"]);
    expect(tasks).toEqual({
      alreadyDone: "completed", safeFirst: "completed", safeSecond: "completed",
      needsApproval: "blocked",
    });
    expect(fakeTransport.mock.calls[0][0].input).toBe(
      "Finish the eligible tasks without asking for repeated go messages.",
    );
    for (const [request] of fakeTransport.mock.calls.slice(1)) {
      expect(request.previous_response_id).toBeTruthy();
      expect(Array.isArray(request.input)).toBe(true);
    }
    expect(unexpectedLiveProvider).not.toHaveBeenCalled();
  });

  it("executes an explicitly independent safe action before a protected tool proposed first", async () => {
    const { writes, tools, tasks } = fixture({ independentlyRunnableSafeAction: true });
    const selected: string[] = [];
    const onBoundary = vi.fn(async () => {});
    const onToolResult = vi.fn(async () => {});
    const onComplete = vi.fn(async () => {});
    const mixed = toolCall("protected-call", "publish_fixture");
    const safe = toolCall("safe-call", "complete_fixture_task", { task: "safeFirst" });
    const responseCreate = vi.fn(async () => ({
      ...mixed, id: "mixed-response", output: [...mixed.output, ...safe.output],
    } as Response));
    const result = await runOpenAIAgencyAgent({
      instructions: "Carry out independently approved safe tasks, leave protected action blocked.",
      userText: "Continue safe work but do not publish.",
      tools, context, verifyCompletion: false, responseCreate,
      hooks: {
        onToolSelected: async value => { selected.push(value.name); },
        onBoundary, onToolResult, onComplete,
      },
    });
    expect(result).toMatchObject({
      status: "blocked", reason: "high_consequence_fork", toolName: "publish_fixture",
      toolCalls: 1,
    });
    expect(writes).toEqual(["safeFirst"]);
    expect(tasks.safeFirst).toBe("completed");
    expect(selected).toEqual(["complete_fixture_task", "publish_fixture"]);
    expect(onToolResult).toHaveBeenCalledOnce();
    expect(onBoundary).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(responseCreate).toHaveBeenCalledOnce();
  });

  it("reports completed and unexecuted tool proposals at a protected boundary without replay", async () => {
    const { tools, writes } = fixture({ independentlyRunnableSafeAction: true });
    tools.register({
      name: "dependent_work",
      risk: "reversible_write",
      description: "Needs a separate decision first",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: async () => { writes.push("dependent-work"); return {}; },
    });
    const selected = [
      toolCall("protected-1", "publish_fixture"),
      toolCall("allowed-1", "complete_fixture_task", { task: "safeFirst" }),
      toolCall("dependent-1", "dependent_work"),
      toolCall("protected-2", "publish_fixture"),
    ];
    const onBoundary = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Keep pending work visible, do not cross approval.",
      userText: "Complete independent work and preserve later tasks.",
      context, tools, verifyCompletion: false,
      responseCreate: async () => ({
        ...selected[0], id: "boundary-with-pending",
        output: selected.flatMap((item) => item.output),
      } as Response),
      hooks: { onBoundary },
    });
    expect(result).toMatchObject({ status: "blocked", toolName: "publish_fixture", toolCalls: 1 });
    expect(writes).toEqual(["safeFirst"]);
    expect(onBoundary).toHaveBeenCalledWith(expect.objectContaining({
      completedBeforeBoundary: ["complete_fixture_task"],
      deferredToolNames: ["dependent_work", "publish_fixture"],
    }));
    expect(unexpectedLiveProvider).not.toHaveBeenCalled();
  });

  it("never moves an unmarked reversible action past a protected tool", async () => {
    const { writes, tools } = fixture();
    const mixed = toolCall("protected-call", "publish_fixture");
    const safe = toolCall("safe-call", "complete_fixture_task", { task: "safeFirst" });
    const result = await runOpenAIAgencyAgent({
      instructions: "Approval required.",
      userText: "Do the safe task after approval.",
      tools, context, verifyCompletion: false,
      responseCreate: async () => ({
        ...mixed, id: "mixed-unmarked", output: [...mixed.output, ...safe.output],
      } as Response),
    });
    expect(result).toMatchObject({ status: "blocked", toolName: "publish_fixture" });
    expect(writes).toEqual([]);
  });

  it("checkpoints an uncertain independent write instead of reaching the later approval action", async () => {
    const { writes, tools } = fixture({ independentlyRunnableSafeAction: true });
    const mixed = toolCall("protected-call", "publish_fixture");
    const safe = toolCall("safe-call", "complete_fixture_task", { task: "safeFirst" });
    const onBoundary = vi.fn(async () => {});
    const result = await runOpenAIAgencyAgent({
      instructions: "Never replay uncertain writes.",
      userText: "Continue safe work.",
      tools, context, verifyCompletion: false,
      idempotency: {
        claim: async () => ({ acquired: false as const, result: null }),
        complete: async () => { throw new Error("must_not_save_unowned_write"); },
      },
      responseCreate: async () => ({
        ...mixed, id: "mixed-uncertain", output: [...mixed.output, ...safe.output],
      } as Response),
      hooks: { onBoundary },
    });
    expect(result.status).toBe("checkpointed");
    expect(writes).toEqual([]);
    expect(onBoundary).not.toHaveBeenCalled();
  });

  it("rejects protected or malformed early-run metadata at registration", () => {
    const { tools } = fixture();
    const protectedTool = {
      name: "fake-privileged", risk: "high_consequence" as const,
      mayRunBeforeProtectedBoundary: true,
      description: "cannot run early", parameters: {},
      execute: async () => null,
    };
    expect(() => tools.register(protectedTool)).toThrow("agency_protected_tool_cannot_run_early");
    expect(() => tools.register({
      ...protectedTool, name: "malformed", risk: "read",
      mayRunBeforeProtectedBoundary: "true" as unknown as boolean,
    })).toThrow("agency_tool_invalid_independent_flag");
  });

  it("stops a selected privileged action without executing it", async () => {
    const { tasks, writes, tools } = fixture();
    let calls = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic fixture. Never bypass owner boundaries.",
      userText: "Continue only within existing authority.",
      responseCreate: async () => toolCall("restricted-" + ++calls, "publish_fixture"),
      tools, context, verifyCompletion: false,
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("high_consequence_fork");
      expect(result.toolName).toBe("publish_fixture");
    }
    expect(calls).toBe(1);
    expect(writes).toEqual([]);
    expect(tasks.safeFirst).toBe("unfinished");
  });

  it("records a round-budget checkpoint instead of claiming unfinished tasks were completed", async () => {
    const { tasks, writes, tools } = fixture();
    let calls = 0;
    const result = await runOpenAIAgencyAgent({
      instructions: "Synthetic fixture with one bounded step.",
      userText: "Continue safe unfinished work.",
      responseCreate: async () => {
        calls++;
        return calls === 1 ? toolCall("inspect-start", "inspect_fixture")
          : textReply("unread-final", "An unprocessed follow-up");
      },
      tools, context, verifyCompletion: false, maxRounds: 1,
    });
    expect(result.status).toBe("checkpointed");
    expect(result.toolCalls).toBe(1);
    expect(writes).toEqual([]);
    expect(tasks.safeFirst).toBe("unfinished");
    expect(tasks.safeSecond).toBe("unfinished");
  });
});
