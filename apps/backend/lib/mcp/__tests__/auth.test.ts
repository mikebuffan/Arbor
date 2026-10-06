import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUserClientForBearerToken: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  createUserClientForBearerToken: mocks.createUserClientForBearerToken,
}));

import { verifyArkMcpToken } from "../auth";

function token(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

describe("ARK MCP authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createUserClientForBearerToken.mockReturnValue({
      auth: { getUser: mocks.getUser },
    });
  });

  it("rejects a request without a bearer token", async () => {
    await expect(verifyArkMcpToken(new Request("https://arbor.test/api/mcp"))).resolves.toBeUndefined();
    expect(mocks.createUserClientForBearerToken).not.toHaveBeenCalled();
  });

  it("rejects a token Supabase does not validate", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });

    await expect(
      verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), "invalid"),
    ).resolves.toBeUndefined();
  });

  it("creates a read-only user context only after Supabase validation", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "b99dfe3d-2677-4c50-9b7b-918096d68c02", email: "mike@example.test" } },
      error: null,
    });
    const bearer = token({ client_id: "chatgpt-client", exp: 2_000_000_000 });

    const auth = await verifyArkMcpToken(
      new Request("https://arbor.test/api/mcp"),
      bearer,
    );

    expect(auth).toMatchObject({
      token: bearer,
      clientId: "chatgpt-client",
      scopes: ["ark.read"],
      expiresAt: 2_000_000_000,
      extra: {
        userId: "b99dfe3d-2677-4c50-9b7b-918096d68c02",
        email: "mike@example.test",
      },
    });
  });

  it("derives submission only from fresh server-owned metadata for the validated client", async () => {
    const project = "11111111-1111-4111-8111-111111111111";
    mocks.getUser.mockResolvedValue({data: {user: {id: "user-1", app_metadata: {
      arbor_ark_mcp: {client_ids: ["chatgpt-client"], project_ids: [project], permissions: ["ark.submit.read_tasks"]},
    }}}, error: null});
    const auth = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({client_id: "chatgpt-client"}));
    expect(auth?.scopes).toEqual(["ark.read", "ark.submit.read_tasks"]);
    expect(auth?.extra?.arkReadTaskProjectIds).toEqual([project]);
    const other = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({client_id: "other-client"}));
    expect(other?.scopes).toEqual(["ark.read"]);
  });

  it("grants Pattern Hop independently from fresh server metadata", async () => {
    const project = "11111111-1111-4111-8111-111111111111";
    const grant = { arbor_ark_mcp: { client_ids: ["chatgpt-client"], project_ids: [project], permissions: ["ark.submit.pattern_hop"] } };
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", app_metadata: grant } }, error: null });
    const auth = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({ client_id: "chatgpt-client" }));
    expect(auth?.scopes).toEqual(["ark.read", "ark.submit.pattern_hop"]);
    expect(auth?.extra?.arkPatternHopProjectIds).toEqual([project]);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", user_metadata: grant } }, error: null });
    const editable = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({ client_id: "chatgpt-client", scope: "ark.submit.pattern_hop", app_metadata: grant }));
    expect(editable?.scopes).toEqual(["ark.read"]);
    expect(editable?.extra?.arkPatternHopProjectIds).toBeUndefined();
  });

  it("does not trust editable metadata or claimed JWT submission scopes", async () => {
    const grant = {arbor_ark_mcp: {client_ids: ["chatgpt-client"], project_ids: ["11111111-1111-4111-8111-111111111111"], permissions: ["ark.submit.read_tasks"]}};
    mocks.getUser.mockResolvedValue({data: {user: {id: "user-1", user_metadata: grant}}, error: null});
    const auth = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({client_id: "chatgpt-client", scope: "ark.submit.read_tasks", app_metadata: grant}));
    expect(auth?.scopes).toEqual(["ark.read"]);
    expect(auth?.extra?.arkReadTaskProjectIds).toBeUndefined();
  });
  it("keeps acceptance grants separate from read-task grants", async () => {
    const project = "11111111-1111-4111-8111-111111111111";
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", app_metadata: { arbor_ark_mcp: {
      client_ids: ["client"], permissions: ["ark.submit.behavior_acceptance"], project_ids: [project] } } } }, error: null });
    const auth = await verifyArkMcpToken(new Request("https://arbor.test/api/mcp"), token({ client_id: "client" }));
    expect(auth?.scopes).toEqual(["ark.read", "ark.submit.behavior_acceptance"]);
    expect(auth?.extra?.arkAcceptanceProjectIds).toEqual([project]);
    expect(auth?.extra?.arkReadTaskProjectIds).toBeUndefined();
  });
});
