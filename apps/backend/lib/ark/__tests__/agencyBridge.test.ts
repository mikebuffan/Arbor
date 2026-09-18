import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueObjective: vi.fn(),
}));

vi.mock("../supabaseStore", () => ({
  SupabaseArkStore: class {
    enqueueObjective = mocks.enqueueObjective;
  },
}));

import { enqueueArkAgencyToolPlan } from "../agencyBridge";

describe("Arbor to ARK bridge", () => {
  it("writes one causal tool plan without copying conversational state", async () => {
    mocks.enqueueObjective.mockResolvedValue({ id: "objective-1" });

    await enqueueArkAgencyToolPlan({
      supabase: {} as never,
      userId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      turnId: "turn-1",
      goal: "finish durable work",
      planId: "plan-1",
      steps: [
        {
          id: "inspect",
          description: "Inspect state",
          capability: "state.inspect",
          arguments: { scope: "project" },
        },
        {
          id: "repair",
          description: "Repair state",
          capability: "state.repair",
          arguments: { safe: true },
          dependencies: ["inspect"],
        },
      ],
    });

    expect(mocks.enqueueObjective).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      goal: "finish durable work",
      priority: undefined,
      budget: undefined,
      idempotencyKey: "plan-1",
      tasks: [
        expect.objectContaining({
          taskKey: "inspect",
          idempotencyKey: "plan-1:inspect",
          dependencies: [],
          payload: expect.objectContaining({
            capability: "state.inspect",
            conversationId: "conversation-1",
            turnId: "turn-1",
          }),
        }),
        expect.objectContaining({
          taskKey: "repair",
          dependencies: ["inspect"],
        }),
      ],
    });
  });
});
