import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  assertProject: vi.fn(),
  assertConversation: vi.fn(),
  userClient: {},
  adminClient: {},
}));

vi.mock("@/lib/ark/agencyBridge", () => ({
  enqueueArkAgencyToolPlan: mocks.enqueue,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProject,
  assertConversationOwnedByUser: mocks.assertConversation,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mocks.adminClient,
}));
vi.mock("../context", () => ({
  arkMcpUserContext: () => ({
    userId: "11111111-1111-4111-8111-111111111111",
    email: "owner@example.test",
    supabase: mocks.userClient,
  }),
}));

import { registerArkSubmissionTool } from "../registerArkSubmissionTool";

const USER = "11111111-1111-4111-8111-111111111111";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const CONVERSATION = "33333333-3333-4333-8333-333333333333";
const REQUEST = "44444444-4444-4444-8444-444444444444";

function setValidEnvironment() {
  vi.stubEnv("ARK_PREVIEW_MCP_SUBMIT_HOST", "true");
  vi.stubEnv("ARK_PREVIEW_MCP_SUBMIT_USER_ID", USER);
  vi.stubEnv("ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID", "chatgpt-client");
  vi.stubEnv("ARK_PREVIEW_MCP_READONLY_HOST", "false");
  vi.stubEnv("ARK_PREVIEW_WORKER_ONLY_HOST", "false");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_PROJECT_ID", "prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feature/ark-mcp-reader-execution-deny-20260926");
  vi.stubEnv("SUPABASE_URL", "https://tzbpjbhroxiqftqwatnb.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://tzbpjbhroxiqftqwatnb.supabase.co");
  vi.stubEnv("ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT", "false");
  vi.stubEnv("ARBOR_ARK_ENABLE_LIVE_EXECUTION", "false");
  vi.stubEnv("ARBOR_ENABLE_ARK_EXECUTION", "false");
  vi.stubEnv("ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY", "false");
}

describe("ARK MCP research submission tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.enqueue.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      status: "queued",
    });
  });

  it("is absent by default", () => {
    const registerTool = vi.fn();
    registerArkSubmissionTool({ registerTool } as never);
    expect(registerTool).not.toHaveBeenCalled();
  });

  it("queues one owned, idempotent research task without starting execution", async () => {
    setValidEnvironment();
    const registerTool = vi.fn();
    registerArkSubmissionTool({ registerTool } as never);
    expect(registerTool).toHaveBeenCalledTimes(1);

    const [, config, handler] = registerTool.mock.calls[0];
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });

    const response = await handler({
      projectId: PROJECT,
      conversationId: CONVERSATION,
      clientRequestId: REQUEST,
      seed: "trace the recovery decision",
      objective: "Build an evidence-backed recovery timeline",
      maxDepth: 4,
      maxHopsPerAttempt: 4,
    }, {
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: USER } } },
    });

    expect(mocks.assertProject).toHaveBeenCalledWith(mocks.userClient, USER, PROJECT);
    expect(mocks.assertConversation).toHaveBeenCalledWith({
      supabase: mocks.userClient,
      userId: USER,
      projectId: PROJECT,
      conversationId: CONVERSATION,
    });
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      supabase: mocks.adminClient,
      userId: USER,
      projectId: PROJECT,
      planId: `mcp-research:${REQUEST}`,
      budget: {
        maxTasksPerCycle: 1,
        maxRuntimeMs: 20_000,
        maxAttemptsPerTask: 12,
      },
      steps: [expect.objectContaining({
        id: "research",
        capability: "arbor_pattern_hop_research",
        maxAttempts: 12,
      })],
    }));
    expect(response.structuredContent).toEqual({
      accepted: true,
      objectiveId: "55555555-5555-4555-8555-555555555555",
      status: "queued",
      executionStarted: false,
    });
  });

  it("never enqueues for an unauthorized user or OAuth client", async () => {
    setValidEnvironment();
    const registerTool = vi.fn();
    registerArkSubmissionTool({ registerTool } as never);
    const [, , handler] = registerTool.mock.calls[0];
    const request = {
      projectId: PROJECT,
      clientRequestId: REQUEST,
      seed: "synthetic research only",
      maxDepth: 2,
      maxHopsPerAttempt: 2,
    };

    await expect(handler(request, {
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: PROJECT } } },
    })).rejects.toThrow("ark_submission_user_denied");

    await expect(handler(request, {
      http: { authInfo: { clientId: "other-client", extra: { userId: USER } } },
    })).rejects.toThrow("ark_submission_client_denied");

    expect(mocks.assertProject).not.toHaveBeenCalled();
    expect(mocks.assertConversation).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("never enqueues if project ownership is rejected", async () => {
    setValidEnvironment();
    mocks.assertProject.mockRejectedValueOnce(new Error("ark_project_owner_mismatch"));
    const registerTool = vi.fn();
    registerArkSubmissionTool({ registerTool } as never);
    const [, , handler] = registerTool.mock.calls[0];

    await expect(handler({
      projectId: PROJECT,
      clientRequestId: REQUEST,
      seed: "synthetic research only",
      maxDepth: 2,
      maxHopsPerAttempt: 2,
    }, {
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: USER } } },
    })).rejects.toThrow("ark_project_owner_mismatch");

    expect(mocks.assertConversation).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("never enqueues if conversation ownership is rejected", async () => {
    setValidEnvironment();
    mocks.assertConversation.mockRejectedValueOnce(new Error("ark_conversation_owner_mismatch"));
    const registerTool = vi.fn();
    registerArkSubmissionTool({ registerTool } as never);
    const [, , handler] = registerTool.mock.calls[0];

    await expect(handler({
      projectId: PROJECT,
      conversationId: CONVERSATION,
      clientRequestId: REQUEST,
      seed: "synthetic research only",
      maxDepth: 2,
      maxHopsPerAttempt: 2,
    }, {
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: USER } } },
    })).rejects.toThrow("ark_conversation_owner_mismatch");

    expect(mocks.assertProject).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

});
