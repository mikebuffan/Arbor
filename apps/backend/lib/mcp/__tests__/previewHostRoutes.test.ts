import { describe, expect, it } from "vitest";
import { isPreviewMcpOnlyDeployment, rejectPreviewMcpOnlyPath } from "../previewHostRoutes";

describe("dedicated ARK Preview MCP ingress", () => {
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
