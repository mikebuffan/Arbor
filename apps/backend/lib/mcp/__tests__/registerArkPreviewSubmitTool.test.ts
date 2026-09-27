import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  assertOwned: vi.fn(),
  admin: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock("../context", () => ({ arkMcpUserContext: mocks.context }));
vi.mock("@/lib/auth/ownership", () => ({ assertProjectOwnedByUser: mocks.assertOwned }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/ark/supabaseStore", () => ({ SupabaseArkStore: class { enqueueObjective = mocks.enqueue; } }));

import { registerArkPreviewSubmitTool } from "../registerArkPreviewSubmitTool";

const projectId = "9366c350-5d82-49f5-b9ef-862af750e3a0";
const seed = "Review the existing Arbor project history for checkpoint/resume safeguard patterns and summarize only provenance-preserving implementation lessons.";

describe("bounded Preview queue submission", () => {
  it("checks ownership before privileged enqueue and submits one inert task with a stable key", async () => {
    const registerTool = vi.fn();
    registerArkPreviewSubmitTool({ registerTool } as never);
    const [, config, submit] = registerTool.mock.calls[0];
    expect(config.annotations.readOnlyHint).toBe(false);
    expect(config.inputSchema.safeParse({ projectId, seed, maxDepth: 3, maxHopsPerAttempt: 2 }).success).toBe(false);
    mocks.context.mockReturnValue({ userId: "b11ff62c-ff6d-4ff5-9eb7-070ac9b8a4e0", supabase: {} });
    mocks.assertOwned.mockRejectedValueOnce(new Error("not_owned"));
    const ctx = { http: { authInfo: { extra: { verifiedClientId: "preview-client" } } } };
    process.env.ARBOR_ARK_PREVIEW_QUEUE_CLIENT_ID = "preview-client";
    await expect(submit({ projectId, seed, maxDepth: 2, maxHopsPerAttempt: 2 }, {})).rejects.toThrow("ark_preview_queue_client_not_authorized");
    await expect(submit({ projectId, seed, maxDepth: 2, maxHopsPerAttempt: 2 }, ctx)).rejects.toThrow("not_owned");
    expect(mocks.admin).not.toHaveBeenCalled();

    mocks.assertOwned.mockResolvedValue(undefined);
    mocks.enqueue.mockResolvedValue({ id: "e994f040-4fab-4d59-ae5b-df882579e410", status: "queued" });
    const input = { projectId, seed, maxDepth: 2, maxHopsPerAttempt: 2 };
    const first = await submit(input, ctx);
    const second = await submit(input, ctx);
    expect(first.structuredContent.executionStarted).toBe(false);
    expect(second.structuredContent.objectiveId).toBe(first.structuredContent.objectiveId);
    expect(mocks.enqueue).toHaveBeenCalledTimes(2);
    const [draft] = mocks.enqueue.mock.calls[0];
    expect(draft.tasks).toHaveLength(1);
    expect(draft.tasks[0]).toMatchObject({ kind: "ark.preview-research", payload: { seed, maxDepth: 2, maxHopsPerAttempt: 2, previewOnly: true } });
    expect(mocks.enqueue.mock.calls[1][0].idempotencyKey).toBe(draft.idempotencyKey);
  });
});
