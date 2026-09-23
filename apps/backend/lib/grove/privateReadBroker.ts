import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  assertProjectOwnedByUser,
  assertConversationOwnedByUser,
} from "@/lib/auth/ownership";
import { readArkProjectSnapshot } from "@/lib/ark/readModel";

const GROVE_PROJECT_REF = "fqjqpuaoifgbweiguacf";
const AUTH_AUDIENCE = "authenticated";

export type GrovePrivateReadConfiguration = {
  groveUrl: string;
  grovePublishableKey: string;
  groveServiceKey: string;
  fireflyUrl: string;
  fireflyServiceKey: string;
  apiOrigin: string;
};

/** A distinct deployment must opt in. The ordinary Firefly backend defaults OFF. */
export function privateGroveReadConfig(
  env: NodeJS.ProcessEnv = process.env,
): GrovePrivateReadConfiguration {
  if (env.GROVE_API_ENABLED !== "true") {
    throw new RouteAccessError(500, "grove_api_not_enabled");
  }
  const groveUrl = env.GROVE_SUPABASE_URL?.trim() ?? "";
  const grovePublishableKey =
    env.GROVE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const groveServiceKey = env.GROVE_SERVICE_ROLE_KEY?.trim() ?? "";
  const fireflyUrl = env.GROVE_FIREFLY_SUPABASE_URL?.trim() ?? "";
  const fireflyServiceKey = env.GROVE_FIREFLY_SERVICE_ROLE_KEY?.trim() ?? "";
  const apiOrigin = env.GROVE_PUBLIC_API_ORIGIN?.trim() ?? "";

  function exactHttpsOrigin(value: string): URL {
    const uri = URL.canParse(value) ? new URL(value) : null;
    if (!uri || uri.protocol !== "https:" || !uri.hostname ||
        uri.username || uri.password || uri.pathname !== "/" ||
        uri.search || uri.hash || uri.port) {
      throw new RouteAccessError(500, "grove_api_not_configured");
    }
    return uri;
  }

  const grove = exactHttpsOrigin(groveUrl);
  const firefly = exactHttpsOrigin(fireflyUrl);
  const api = exactHttpsOrigin(apiOrigin);
  if (grove.hostname !== `${GROVE_PROJECT_REF}.supabase.co` ||
      firefly.hostname !== "ncpdlyakrzfvobmwzbon.supabase.co" ||
      api.hostname === grove.hostname ||
      api.hostname === firefly.hostname ||
      api.hostname === "firefly-coral.vercel.app" ||
      !grovePublishableKey || !groveServiceKey || !fireflyServiceKey ||
      grovePublishableKey === groveServiceKey ||
      groveServiceKey === fireflyServiceKey ||
      groveServiceKey.startsWith("sb_publishable_") ||
      fireflyServiceKey.startsWith("sb_publishable_")) {
    throw new RouteAccessError(500, "grove_api_not_configured");
  }
  return {
    groveUrl: grove.origin, grovePublishableKey, groveServiceKey,
    fireflyUrl: firefly.origin, fireflyServiceKey,
    apiOrigin: api.origin,
  };
}

/** JWT claims are only a second guard AFTER Supabase Auth verifies the token. */
export function groveTokenClaimsMatch(
  token: string,
  verifiedUserId: string,
  groveUrl: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  try {
    if (token.length > 8192) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload === "object" && payload !== null &&
      payload.iss === `${groveUrl}/auth/v1` &&
      payload.aud === AUTH_AUDIENCE &&
      payload.role === AUTH_AUDIENCE &&
      payload.sub === verifiedUserId &&
      Number.isInteger(payload.exp) &&
      payload.exp > nowSeconds &&
      (payload.nbf === undefined ||
        (Number.isInteger(payload.nbf) && payload.nbf <= nowSeconds));
  } catch {
    return false;
  }
}

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match || match[1].length > 8192) {
    throw new RouteAccessError(401, "grove_auth_required");
  }
  return match[1];
}

function serverClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requiredRecord<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
  fields: string,
  errorCode: string,
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .select(fields)
    .eq(column, value)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new RouteAccessError(500, "grove_read_bridge_unavailable");
  if (!data) throw new RouteAccessError(403, errorCode);
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new RouteAccessError(500, "grove_read_bridge_unavailable");
  }
  return data as unknown as T;
}

/** Shared owner+bridge validation: Grove Auth is verified before any service
 * key; no user identity or Firefly scope comes from caller-controlled JSON. */
async function authorizedPrivateGroveBridge(req: Request) {
  const config = privateGroveReadConfig();
  if (new URL(req.url).origin !== config.apiOrigin) {
    throw new RouteAccessError(404, "grove_route_not_found");
  }
  const token = bearerToken(req);
  const groveUser = createClient(
    config.groveUrl, config.grovePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  // getUser(token) validates with the configured Grove Auth server, not the
  // Firefly instance and not a decoded but unverified JWT.
  const { data: { user }, error: authError } =
    await groveUser.auth.getUser(token);
  if (authError || !user ||
      !groveTokenClaimsMatch(token, user.id, config.groveUrl)) {
    throw new RouteAccessError(401, "grove_invalid_token");
  }
  const owner = await requiredRecord<{ user_id: string }>(
    groveUser, "grove_private_owner_access",
    "user_id", user.id, "user_id,revoked_at", "grove_not_invited",
  );
  if (owner.user_id !== user.id) {
    throw new RouteAccessError(403, "grove_not_invited");
  }

  const groveAdmin = serverClient(config.groveUrl, config.groveServiceKey);
  const bridge = await requiredRecord<{ grove_user_id: string; firefly_user_id: string }>(
    groveAdmin, "grove_private_firefly_bridge", "grove_user_id", user.id,
    "grove_user_id,firefly_user_id,revoked_at", "grove_bridge_not_granted",
  );
  if (bridge.grove_user_id !== user.id ||
      typeof bridge.firefly_user_id !== "string") {
    throw new RouteAccessError(403, "grove_bridge_not_granted");
  }
  return {
    config,
    groveUserId: user.id,
    fireflyUserId: bridge.firefly_user_id,
    groveAdmin,
  };
}

/** Only explicit ACTIVE grants backed by Firefly project ownership are
 * discoverable. This returns IDs, never arbitrary metadata from the other
 * user's/project's records. No private owner account means no discovery. */
export async function readPrivateGroveProjects(req: Request): Promise<string[]> {
  const { config, groveUserId, fireflyUserId, groveAdmin } =
    await authorizedPrivateGroveBridge(req);
  const { data, error } = await groveAdmin
    .from("grove_private_ark_project_grants")
    .select("grove_user_id,firefly_project_id")
    .eq("grove_user_id", groveUserId)
    .is("revoked_at", null)
    .limit(51);
  if (error || !Array.isArray(data) || data.length > 50) {
    throw new RouteAccessError(500, "grove_read_bridge_unavailable");
  }

  const ids = new Set<string>();
  for (const row of data) {
    const id = row?.firefly_project_id;
    if (row?.grove_user_id !== groveUserId ||
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
        ids.has(id)) {
      throw new RouteAccessError(500, "grove_read_bridge_unavailable");
    }
    ids.add(id);
  }
  if (!ids.size) return [];
  const fireflyAdmin = serverClient(config.fireflyUrl, config.fireflyServiceKey);
  for (const id of ids) {
    // Service role bypasses RLS; never expose an authorized Grove grant whose
    // Firefly ownership changed, even if the old grant is still present.
    await assertProjectOwnedByUser(fireflyAdmin, fireflyUserId, id);
  }
  return [...ids].sort();
}

/** Scoped base for BOTH status and a future private chat. A Grove bearer
 * never becomes a Firefly bearer, and no user identity comes from input JSON.
 * Service-role access requires the explicit grant + Firefly ownership check. */
async function authorizedPrivateGroveProject(req: Request, projectId: string) {
  const { config, groveUserId, fireflyUserId, groveAdmin } =
    await authorizedPrivateGroveBridge(req);
  const grants = await groveAdmin
    .from("grove_private_ark_project_grants")
    .select("grove_user_id,firefly_project_id")
    .eq("grove_user_id", groveUserId)
    .eq("firefly_project_id", projectId)
    .is("revoked_at", null)
    .maybeSingle();
  if (grants.error) {
    throw new RouteAccessError(500, "grove_read_bridge_unavailable");
  }
  if (!grants.data ||
      grants.data.grove_user_id !== groveUserId ||
      grants.data.firefly_project_id !== projectId) {
    throw new RouteAccessError(404, "project_not_found");
  }

  const fireflyAdmin = serverClient(
    config.fireflyUrl, config.fireflyServiceKey,
  );
  // Admin bypasses RLS: this proof MUST precede any Firefly conversation,
  // Layer or LM request and must be independently re-checked for live turns.
  await assertProjectOwnedByUser(fireflyAdmin, fireflyUserId, projectId);
  return { groveUserId, fireflyUserId, projectId, groveAdmin, fireflyAdmin };
}

const validUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** READ-AUTHORIZATION SEAM ONLY: no chat endpoint, mutation, LM invocation,
 * conversation creation or implied permission to execute an ARK objective.
 * The incoming conversation must exist, belong to the mapped Firefly owner,
 * and belong to the selected Grove-granted project. */
export async function authorizePrivateGroveConversation(
  req: Request,
  projectId: string,
  conversationId: string,
) {
  if (!validUuid.test(projectId) || !validUuid.test(conversationId)) {
    throw new RouteAccessError(404, "grove_invalid_conversation_scope");
  }
  const authorized = await authorizedPrivateGroveProject(req, projectId);
  await assertConversationOwnedByUser({
    supabase: authorized.fireflyAdmin,
    userId: authorized.fireflyUserId,
    projectId,
    conversationId,
  });
  return {
    ...authorized,
    conversationId,
    access: "read-only" as const,
  };
}

/** No scope or owner identity is accepted from request JSON. */
export async function readPrivateGroveArk(req: Request, projectId: string) {
  const authorized = await authorizedPrivateGroveProject(req, projectId);
  const snapshot = await readArkProjectSnapshot({
    supabase: authorized.fireflyAdmin,
    userId: authorized.fireflyUserId,
    projectId,
    objectiveLimit: 20,
    eventLimit: 100,
  });
  return snapshot;
}


/**
 * Existing-conversation discovery only. The Grove owner first presents a
 * verified Grove JWT and an ACTIVE project grant; the mapped Firefly owner is
 * checked against the project BEFORE reading this service-role table.
 *
 * No arbitrary account ID, cross-project conversation, title, transcript,
 * fallback conversation or newly invented chat ID is returned. The caller
 * must select an already-existing conversation and each subsequent chat turn
 * must independently call authorizePrivateGroveConversation().
 */
export type GrovePrivateConversationChoice = {
  conversationId: string;
  createdAt: string;
  updatedAt: string;
};
export type GrovePrivateConversationsResult = {
  projectId: string;
  conversations: GrovePrivateConversationChoice[];
  mayBeTruncated: boolean;
};
export async function readPrivateGroveConversations(
  req: Request,
  projectId: string,
): Promise<GrovePrivateConversationsResult> {
  if (!validUuid.test(projectId))
    throw new RouteAccessError(404, "grove_invalid_project_scope");
  const { fireflyAdmin, fireflyUserId } =
    await authorizedPrivateGroveProject(req, projectId);
  const { data, error } = await fireflyAdmin.from("conversations")
    .select("id,user_id,project_id,created_at,updated_at")
    .eq("user_id", fireflyUserId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (error || !Array.isArray(data) || data.length > 21)
    throw new RouteAccessError(500, "grove_private_conversations_unavailable");
  const seen = new Set<string>();
  const records: GrovePrivateConversationChoice[] = [];
  for (const row of data) {
    if (!row || row.user_id !== fireflyUserId ||
        row.project_id !== projectId ||
        typeof row.id !== "string" || !validUuid.test(row.id) ||
        seen.has(row.id) ||
        typeof row.created_at !== "string" ||
        !Number.isFinite(Date.parse(row.created_at)) ||
        typeof row.updated_at !== "string" ||
        !Number.isFinite(Date.parse(row.updated_at)))
      throw new RouteAccessError(500, "grove_private_conversations_unavailable");
    seen.add(row.id);
    if (records.length < 20)
      records.push({
        conversationId: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
  }
  return {
    projectId,
    conversations: records,
    mayBeTruncated: data.length > 20,
  };
}
