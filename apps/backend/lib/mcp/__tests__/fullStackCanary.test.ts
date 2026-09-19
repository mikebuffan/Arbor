import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readArkProjectSnapshot: vi.fn(),
  arkMcpUserContext: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
}));

vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mocks.readArkProjectSnapshot,
}));

vi.mock("../context", () => ({
  arkMcpUserContext: mocks.arkMcpUserContext,
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mocks.assertConversationOwnedByUser,
}));

import { registerArkReadTools } from "../registerArkReadTools";

type Fixture = {
  projectId: string;
  snapshots: Array<Record<string, unknown>>;
};

function fixture(): Fixture {
  return JSON.parse(
    readFileSync(
      new URL("../../../../../fixtures/ark_full_stack_canary.json", import.meta.url),
      "utf8",
    ),
  ) as Fixture;
}

function getStatusHandler() {
  const registerTool = vi.fn();
  registerArkReadTools({ registerTool } as never);
  const call = registerTool.mock.calls.find(([name]) => name === "get_ark_status");
  if (!call) throw new Error("get_ark_status was not registered");
  return {
    config: call[1],
    handler: call[2] as (
      input: { projectId: string; objectiveLimit: number },
      ctx: unknown,
    ) => Promise<{ structuredContent: Record<string, unknown> }>,
  };
}

describe("full-stack ARK canary through ChatGPT read boundary", () => {
  it("shows the exact persisted checkpoint receipt without gaining write authority", async () => {
    const canary = fixture();
    const checkpoint = canary.snapshots[2];

    mocks.arkMcpUserContext.mockReturnValue({
      userId: "11111111-1111-1111-1111-111111111111",
      email: null,
      supabase: {},
    });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.readArkProjectSnapshot.mockResolvedValue(checkpoint);

    const { config, handler } = getStatusHandler();
    const result = await handler(
      { projectId: canary.projectId, objectiveLimit: 10 },
      {},
    );

    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(result.structuredContent).toMatchObject({
      available: true,
      objectives: [{ status: "checkpointed" }],
      tasks: [{ status: "checkpointed", checkpoint_sequence: 1 }],
      checkpoints: [{
        sequence: 1,
        reason: "interruption",
        next_action: "Resume safe canary read",
      }],
      truncated: false,
    });
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      {},
      "11111111-1111-1111-1111-111111111111",
      canary.projectId,
    );
  });

  it("shows verified completion and the same causal receipts the Environment consumes", async () => {
    const canary = fixture();
    const completed = canary.snapshots.at(-1)!;

    mocks.arkMcpUserContext.mockReturnValue({
      userId: "11111111-1111-1111-1111-111111111111",
      email: null,
      supabase: {},
    });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.readArkProjectSnapshot.mockResolvedValue(completed);

    const { handler } = getStatusHandler();
    const result = await handler(
      { projectId: canary.projectId, objectiveLimit: 10 },
      {},
    );

    expect(result.structuredContent).toMatchObject({
      objectives: [{
        status: "completed",
        completion_evidence: {
          verification: "passed",
          canary: "safe-read",
        },
      }],
      tasks: [{
        status: "completed",
        attempt_count: 2,
        checkpoint_sequence: 1,
      }],
      checkpoints: [{ sequence: 1 }],
      events: [
        { event_type: "objective_verified" },
        { event_type: "task_completed" },
      ],
      truncated: false,
    });
  });
});
