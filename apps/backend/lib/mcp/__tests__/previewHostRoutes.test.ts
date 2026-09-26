import { describe, expect, it } from "vitest";
import { isPreviewMcpOnlyDeployment, rejectPreviewMcpOnlyPath, isCorrectPreviewMcpSupabaseEnvironment } from "../previewHostRoutes";

describe("dedicated ARK Preview MCP ingress", () => {
  it("requires both Supabase URL env values to equal dedicated Preview", () => {
    const good = "https://tzbpjbhroxiqftqwatnb.supabase.co";
    const primary = "https://ncpdlyakrzfvobmwzbon.supabase.co";
    expect(isCorrectPreviewMcpSupabaseEnvironment({ NEXT_PUBLIC_SUPABASE_URL: good, SUPABASE_URL: good })).toBe(true);
    expect(isCorrectPreviewMcpSupabaseEnvironment({ NEXT_PUBLIC_SUPABASE_URL: primary, SUPABASE_URL: good })).toBe(false);
    expect(isCorrectPreviewMcpSupabaseEnvironment({ NEXT_PUBLIC_SUPABASE_URL: good })).toBe(false);
    expect(isCorrectPreviewMcpSupabaseEnvironment({})).toBe(false);
  });
  it("enables isolation only on an explicit true flag", () => {
    expect(isPreviewMcpOnlyDeployment(undefined)).toBe(false);
    expect(isPreviewMcpOnlyDeployment("false")).toBe(false);
    expect(isPreviewMcpOnlyDeployment("true")).toBe(true);
  });
  it.each([
    "/api/mcp",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/api/mcp",
  ])("allows the exact resource or metadata path: %s", path => {
    expect(rejectPreviewMcpOnlyPath(path, true)).toBe(false);
  });
  it.each([
    "/",
    "/api/admin/system/heartbeat",
    "/api/chat",
    "/api/chat/attachments/access",
    "/favicon.ico",
    "/_next/static/file.js",
    "/api/mcp/other",
    "/.well-known/oauth-protected-resource/other",
  ])("blocks every unrelated endpoint including cron: %s", path => {
    expect(rejectPreviewMcpOnlyPath(path, true)).toBe(true);
    expect(rejectPreviewMcpOnlyPath(path, false)).toBe(false);
  });
});
