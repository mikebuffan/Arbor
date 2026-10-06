import { describe, expect, it, vi } from "vitest";
vi.mock("../context", () => ({ arkMcpUserContext: () => ({ userId: "owner", email: null }) }));
import { registerArkReadTools } from "../registerArkReadTools";

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
  it("does not report an effective behavior permission while the feature is disabled", async () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "false");
    const registerTool = vi.fn(); registerArkReadTools({ registerTool } as never);
    const [, , run] = registerTool.mock.calls.find(c => c[0] === "get_arbor_profile")!;
    const r = await run({}, { http: { authInfo: { scopes: ["ark.submit.behavior_acceptance"],
      extra: { arkAcceptanceProjectIds: ["project"] } } } });
    expect(r.structuredContent).toMatchObject({ access: "read-only", canSubmitBehaviorTests: false, oauthClientId: null });
  });
});
