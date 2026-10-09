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
function fixture() {
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
