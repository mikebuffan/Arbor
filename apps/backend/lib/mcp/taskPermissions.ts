import type { ServerContext } from "@modelcontextprotocol/server";

export const ARK_READ_TASK_SUBMIT_PERMISSION = "ark.submit.read_tasks";
export const ARK_PATTERN_HOP_SUBMIT_PERMISSION = "ark.submit.pattern_hop";
export function isArkMcpSubmissionEnabled(): boolean {
  return process.env.ARBOR_ENABLE_ARK_MCP_SUBMISSION === "true";
}

/** An application permission, not a custom OAuth scope. Supabase currently
 * supports standard OAuth identity scopes only. Grants must come from fresh
 * server-owned app_metadata after getUser validates the token, never from
 * editable user_metadata or unvalidated JWT fields. */
export function arkReadTaskProjects(appMetadata: unknown, clientId: unknown): string[] {
  return arkGrantedProjects(appMetadata, clientId, ARK_READ_TASK_SUBMIT_PERMISSION);
}

export function arkPatternHopProjects(appMetadata: unknown, clientId: unknown): string[] {
  return arkGrantedProjects(appMetadata, clientId, ARK_PATTERN_HOP_SUBMIT_PERMISSION);
}

function arkGrantedProjects(appMetadata: unknown, clientId: unknown, permission: string): string[] {
  if (typeof clientId !== "string" || !clientId) return [];
  if (!appMetadata || typeof appMetadata !== "object" || Array.isArray(appMetadata)) return [];
  const grant = (appMetadata as Record<string, unknown>).arbor_ark_mcp;
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) return [];
  const row = grant as Record<string, unknown>;
  if (!Array.isArray(row.client_ids) || !row.client_ids.includes(clientId)
      || !Array.isArray(row.permissions) || !row.permissions.includes(permission)
      || !Array.isArray(row.project_ids)) return [];
  return Array.from(new Set(row.project_ids.filter((p): p is string => typeof p === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))));
}

export function isArkPatternHopSubmissionEnabled(): boolean {
  return isArkMcpSubmissionEnabled() && process.env.ARBOR_ENABLE_ARK_MCP_PATTERN_HOP === "true"
    && process.env.ARBOR_ENABLE_PATTERN_HOP_CONTROLS === "true";
}

export function assertArkPatternHopSubmission(ctx: ServerContext, projectId: string): void {
  const auth = ctx.http?.authInfo;
  if (!isArkPatternHopSubmissionEnabled()) throw new Error("ark_pattern_hop_submission_disabled");
  if (!auth?.scopes.includes(ARK_PATTERN_HOP_SUBMIT_PERMISSION)
      || !Array.isArray(auth.extra?.arkPatternHopProjectIds)
      || !auth.extra.arkPatternHopProjectIds.includes(projectId))
    throw new Error("ark_pattern_hop_submission_not_granted");
}

export function assertArkReadTaskSubmission(ctx: ServerContext, projectId: string): void {
  const auth = ctx.http?.authInfo;
  if (!isArkMcpSubmissionEnabled()) throw new Error("ark_mcp_submission_disabled");
  if (!auth?.scopes.includes(ARK_READ_TASK_SUBMIT_PERMISSION)
      || !Array.isArray(auth.extra?.arkReadTaskProjectIds)
      || !auth.extra.arkReadTaskProjectIds.includes(projectId))
    throw new Error("ark_mcp_submission_not_granted");
}
