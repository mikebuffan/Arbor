import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as mcpPost } from "@/app/api/mcp/route";
import { GET as resourceMetadata } from "@/app/.well-known/oauth-protected-resource/route";

describe("ARK MCP HTTP boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires authentication before MCP dispatch", async () => {
    const response = await mcpPost(
      new Request("https://arbor.example/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test", version: "1" },
          },
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "https://arbor.example/.well-known/oauth-protected-resource",
    );
  });

  it("publishes Supabase as the OAuth authorization server", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");

    const response = resourceMetadata(
      new Request("https://arbor.example/.well-known/oauth-protected-resource"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resource).toBe("https://arbor.example");
    expect(body.authorization_servers).toEqual([
      "https://project-ref.supabase.co/auth/v1",
    ]);
  });
});
