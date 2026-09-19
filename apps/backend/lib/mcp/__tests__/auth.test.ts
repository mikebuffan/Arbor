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
});
