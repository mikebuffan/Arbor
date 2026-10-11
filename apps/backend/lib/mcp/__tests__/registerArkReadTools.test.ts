import { describe, expect, it, vi } from "vitest";
vi.mock("../context", () => ({ arkMcpUserContext: () => ({ userId: "owner", email: null, supabase: {} }) }));
import { registerArkReadTools } from "../registerArkReadTools";
import { ARBOR_OPERATING_SELF_MODEL_VERSION } from "@/lib/arbor/selfModel/operatingSelfModel";

describe("ARK MCP tool boundary", () => {
  it("registers only explicitly read-only tools", () => {
    const registerTool = vi.fn();
    registerArkReadTools({ registerTool } as never);

    expect(registerTool).toHaveBeenCalledTimes(6);
    expect(registerTool.mock.calls.map(([name]) => name)).toEqual([
      "get_arbor_archive_page",
      "get_arbor_profile",
      "get_arbor_memory_recall",
      "list_arbor_projects",
      "get_ark_status",
      "get_arbor_continuity",
    ]);

    for (const [, config] of registerTool.mock.calls) {
      expect(config.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(config.inputSchema).toBeDefined();
      expect(config.outputSchema).toBeDefined();
    }
  });
  it("reports effective behavior submission separately and does not label enabled writes read-only", async () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "true");
    const registerTool = vi.fn(); registerArkReadTools({ registerTool } as never);
    const [, , run] = registerTool.mock.calls.find(c => c[0] === "get_arbor_profile")!;
    const r = await run({}, { http: { authInfo: { scopes: ["ark.submit.behavior_acceptance"],
      extra: { arkAcceptanceProjectIds: ["project"], oauthClientId: "verified-client" } } } });
    expect(r.structuredContent).toMatchObject({ access: "read-and-submit-behavior-tests", canSubmitBehaviorTests: true,
      canSubmitReadTasks: false, oauthClientId: "verified-client" });
  });
  it("reports objective control separately only when feature and grant both exist", async () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_OBJECTIVE_CONTROL", "true");
    const registerTool = vi.fn();
    registerArkReadTools({ registerTool } as never);
    const [, , run] = registerTool.mock.calls
      .find(c => c[0] === "get_arbor_profile")!;
    const r = await run({}, {
      http: {
        authInfo: {
          scopes: ["ark.control.objectives"],
          extra: {
            arkObjectiveControlProjectIds: ["project"],
            oauthClientId: "verified-client",
          },
        },
      },
    });
    expect(r.structuredContent).toMatchObject({
      access: "read-and-control-objectives",
      canSubmitReadTasks: false,
      canSubmitBehaviorTests: false,
      canControlObjectives: true,
      oauthClientId: "verified-client",
    });

    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_OBJECTIVE_CONTROL", "false");
    const registerDisabled = vi.fn();
    registerArkReadTools({ registerTool: registerDisabled } as never);
    const [, , runDisabled] = registerDisabled.mock.calls
      .find(c => c[0] === "get_arbor_profile")!;
    const disabled = await runDisabled({}, {
      http: {
        authInfo: {
          scopes: ["ark.control.objectives"],
          extra: { arkObjectiveControlProjectIds: ["project"] },
        },
      },
    });
    expect(disabled.structuredContent.canControlObjectives).toBe(false);
  });

  it("does not report an effective behavior permission while the feature is disabled", async () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "false");
    const registerTool = vi.fn(); registerArkReadTools({ registerTool } as never);
    const [, , run] = registerTool.mock.calls.find(c => c[0] === "get_arbor_profile")!;
    const r = await run({}, { http: { authInfo: { scopes: ["ark.submit.behavior_acceptance"],
      extra: { arkAcceptanceProjectIds: ["project"] } } } });
    expect(r.structuredContent).toMatchObject({ access: "read-only", canSubmitBehaviorTests: false, oauthClientId: null });
  });
  it("reports an exact build SHA and operating model version without expanding permissions", async () => {
    const sha = "a".repeat(40);
    const runProfile = async () => {
      const registerTool = vi.fn();
      registerArkReadTools({ registerTool } as never);
      const [, , run] = registerTool.mock.calls.find(c => c[0] === "get_arbor_profile")!;
      return (await run({}, { http: { authInfo: { scopes: ["ark.read"], extra: {} } } })).structuredContent;
    };
    try {
      vi.stubEnv("VERCEL_GIT_COMMIT_SHA", sha);
      const valid = await runProfile();
      expect(valid).toMatchObject({
        access: "read-only", canSubmitReadTasks: false, canControlObjectives: false,
        reportedSourceCommit: sha, sourceCommitEvidence: "vercel_build_environment",
        operatingSelfModelVersion: ARBOR_OPERATING_SELF_MODEL_VERSION,
      });
      vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "not-a-real-sha");
      const invalid = await runProfile();
      expect(invalid.reportedSourceCommit).toBeNull();
      expect(invalid.sourceCommitEvidence).toBe("unavailable");
      vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
      const missing = await runProfile();
      expect(missing.reportedSourceCommit).toBeNull();
      expect(missing.sourceCommitEvidence).toBe("unavailable");
      expect(missing.operatingSelfModelVersion).toBe(ARBOR_OPERATING_SELF_MODEL_VERSION);
    } finally {
      vi.unstubAllEnvs();
    }
  });

});
