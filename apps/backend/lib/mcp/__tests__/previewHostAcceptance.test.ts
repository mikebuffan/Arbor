import { describe, expect, it, vi } from "vitest";
import { checkArkPreviewMcpHost } from "../previewHostAcceptance";

const resource = "https://arbor-ark-preview.example.org/api/mcp";
const issuer = "https://tzbpjbhroxiqftqwatnb.supabase.co/auth/v1";
const meta = () => ({ resource, authorization_servers: [issuer] });
const response = (status: number, body?: unknown) =>
  new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("read-only ARK Preview MCP host acceptance", () => {
  it("accepts only the exact Preview issuer/resource and unauthenticated 401", async () => {
    const client = vi.fn(async (url: string, init: RequestInit) => {
      expect(init.redirect).toBe("manual");
      if (url.endsWith("/.well-known/oauth-protected-resource")) return response(200, meta());
      expect(url).toBe(resource);
      expect(init.headers).not.toHaveProperty("Authorization");
      return response(401);
    });
    await expect(checkArkPreviewMcpHost(resource, client)).resolves.toEqual({
      resource, issuer, unauthenticatedStatus: 401, readOnlyHostGate: true,
    });
    expect(client).toHaveBeenCalledTimes(2);
  });

  it.each([
    "http://arbor-ark-preview.example.org/api/mcp",
    "https://arbor-ark-preview.example.org/api/other",
    "https://user:pass@arbor-ark-preview.example.org/api/mcp",
    "https://arbor-ark-preview.example.org/api/mcp?token=bad",
    "not-a-url",
  ])("rejects invalid MCP URLs without making a request: %s", async (url) => {
    const client = vi.fn();
    await expect(checkArkPreviewMcpHost(url, client)).rejects.toThrow("ark_preview_mcp_invalid_url");
    expect(client).not.toHaveBeenCalled();
  });

  it("rejects primary Firefly OAuth issuer", async () => {
    const client = vi.fn(async () => response(200, {
      resource,
      authorization_servers: ["https://ncpdlyakrzfvobmwzbon.supabase.co/auth/v1"],
    }));
    await expect(checkArkPreviewMcpHost(resource, client)).rejects.toThrow(
      "ark_preview_mcp_wrong_resource_or_issuer",
    );
    expect(client).toHaveBeenCalledTimes(1);
  });

  it("rejects resource mismatch and a second issuer", async () => {
    const client = vi.fn(async () => response(200, {
      resource: "https://other.example.org/api/mcp",
      authorization_servers: [issuer, "https://other.example.org/auth/v1"],
    }));
    await expect(checkArkPreviewMcpHost(resource, client)).rejects.toThrow(
      "ark_preview_mcp_wrong_resource_or_issuer",
    );
  });

  it("rejects a publicly callable MCP endpoint", async () => {
    const client = vi.fn(async (url: string) =>
      url.includes(".well-known") ? response(200, meta()) : response(200, {}));
    await expect(checkArkPreviewMcpHost(resource, client)).rejects.toThrow(
      "ark_preview_mcp_auth_not_enforced",
    );
  });

  it("rejects redirect instead of valid metadata", async () => {
    const client = vi.fn(async () => response(302));
    await expect(checkArkPreviewMcpHost(resource, client)).rejects.toThrow(
      "ark_preview_mcp_metadata_unavailable",
    );
  });
});
