/**
 * Isolated ARK Preview read-only MCP host ingress.
 * This is a DEPLOYMENT gate, not ARK task authorization.
 * The normal Firefly host is unchanged when the flag is absent.
 */
const allowed = new Set([
  "/api/mcp",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/api/mcp",
]);

export function isPreviewMcpOnlyDeployment(value: string | undefined): boolean {
  return value === "true";
}

export function rejectPreviewMcpOnlyPath(
  pathname: string,
  previewOnly: boolean,
): boolean {
  return previewOnly && !allowed.has(pathname);
}
