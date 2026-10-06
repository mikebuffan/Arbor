import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/server";
import { createUserClientForBearerToken } from "@/lib/supabase/user";
import {
  arkReadTaskProjects, arkPatternHopProjects, arkAcceptanceProjects,
  ARK_READ_TASK_SUBMIT_PERMISSION, ARK_PATTERN_HOP_SUBMIT_PERMISSION, ARK_ACCEPTANCE_SUBMIT_PERMISSION,
} from "./taskPermissions";

type VerifiedTokenClaims = {
  client_id?: unknown;
  exp?: unknown;
};

function verifiedTokenClaims(token: string): VerifiedTokenClaims {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

export async function verifyArkMcpToken(
  _request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const token = bearerToken?.trim();
  if (!token) return undefined;

  const supabase = createUserClientForBearerToken(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return undefined;

  // Claims are consumed only after Supabase has validated the complete token.
  const claims = verifiedTokenClaims(token);
  const grantedProjects = arkReadTaskProjects(user.app_metadata, claims.client_id);
  const patternHopProjects = arkPatternHopProjects(user.app_metadata, claims.client_id);
  const acceptanceProjects = arkAcceptanceProjects(user.app_metadata, claims.client_id);

  return {
    token,
    clientId:
      typeof claims.client_id === "string"
        ? claims.client_id
        : "supabase-oauth-client",
    scopes: ["ark.read", ...(grantedProjects.length ? [ARK_READ_TASK_SUBMIT_PERMISSION] : []),
      ...(patternHopProjects.length ? [ARK_PATTERN_HOP_SUBMIT_PERMISSION] : []),
      ...(acceptanceProjects.length ? [ARK_ACCEPTANCE_SUBMIT_PERMISSION] : [])],
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    extra: {
      userId: user.id,
      email: user.email ?? null,
      oauthClientId: typeof claims.client_id === "string" ? claims.client_id : null,
      ...(grantedProjects.length ? {arkReadTaskProjectIds: grantedProjects} : {}),
      ...(patternHopProjects.length ? {arkPatternHopProjectIds: patternHopProjects} : {}),
      ...(acceptanceProjects.length ? {arkAcceptanceProjectIds: acceptanceProjects} : {}),
    },
  };
}
