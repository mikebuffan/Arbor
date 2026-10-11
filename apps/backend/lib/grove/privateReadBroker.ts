import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  reserveIndependentGroveDeletion, confirmIndependentGroveDeletion,
} from "@/lib/grove/privateDeletionCustody";
import {
  assertProjectOwnedByUser,
  assertConversationOwnedByUser,
} from "@/lib/auth/ownership";
import { readArkProjectSnapshot } from "@/lib/ark/readModel";

const GROVE_PROJECT_REF = "fqjqpuaoifgbweiguacf";
const GROVE_VERCEL_PROJECT_ID = "prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN";
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

  // Local/source tests need no Vercel metadata, but a Vercel-hosted private
  // API must prove it is the dedicated Grove project before any service key
  // is accepted. This prevents a copied GROVE_API_ENABLED flag on Firefly or
  // ARK Preview from turning another deployment into the private broker.
  const vercelProjectId = env.VERCEL_PROJECT_ID?.trim() ?? "";
  const profile = env.GROVE_ISOLATED_TEST_PROFILE?.trim() ?? "";
  const isolatedTest = profile === "one-arbor-20261009";
  if (profile && !isolatedTest) {
    throw new RouteAccessError(500, "grove_api_not_configured");
  }
  // This opt-in accepts only the two empty, separately provisioned test realms.
  // A copied flag on main, Production, another project or local runtime fails.
  if (isolatedTest ? (
    env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" ||
    vercelProjectId !== "prj_bliWIoBwJ053cXPIBB9uJzpW4PK6" ||
    env.VERCEL_GIT_COMMIT_REF !==
      "review/one-arbor-independence-budget-preflight-20261009"
  ) : ((env.VERCEL === "1" && vercelProjectId !== GROVE_VERCEL_PROJECT_ID) ||
      (vercelProjectId && vercelProjectId !== GROVE_VERCEL_PROJECT_ID))) {
    throw new RouteAccessError(500, "grove_api_not_configured");
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
  const expectedGroveHost = isolatedTest
    ? "htliidxymbbgurtvnptw.supabase.co"
    : `${GROVE_PROJECT_REF}.supabase.co`;
  const expectedFireflyHost = isolatedTest
    ? "fieszfvzkfgvccrznmhw.supabase.co"
    : "ncpdlyakrzfvobmwzbon.supabase.co";
  if (grove.hostname !== expectedGroveHost ||
      firefly.hostname !== expectedFireflyHost ||
      (isolatedTest && api.hostname !==
        "arbor-independence-isolated-git-6238a9-mikes-projects-4d16734a.vercel.app") ||
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
async function assertPrivateGroveConversationNotDeleted(
  groveAdmin: SupabaseClient,
  groveUserId: string,
  projectId: string,
  conversationId: string,
): Promise<void> {
  // No tombstone schema can be assumed before the explicitly approved
  // private-chat migration. After chat activation, missing schema fails CLOSED.
  if (process.env.GROVE_PRIVATE_CHAT_PREVIEW_ENABLED !== "true" &&
      process.env.GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED !== "true") return;
  const { data, error } = await groveAdmin
    .from("grove_private_conversation_tombstones")
    .select("grove_user_id,firefly_project_id,firefly_conversation_id")
    .eq("grove_user_id", groveUserId)
    .eq("firefly_project_id", projectId)
    .eq("firefly_conversation_id", conversationId)
    .maybeSingle();
  if (error || (data && (
      typeof data.grove_user_id !== "string" ||
      typeof data.firefly_project_id !== "string" ||
      typeof data.firefly_conversation_id !== "string" ||
      data.grove_user_id.toLowerCase() !== groveUserId.toLowerCase() ||
      data.firefly_project_id.toLowerCase() !== projectId.toLowerCase() ||
      data.firefly_conversation_id.toLowerCase() !== conversationId.toLowerCase()))) {
    throw new RouteAccessError(500, "grove_private_delete_fence_unavailable");
  }
  if (data) throw new RouteAccessError(404, "grove_private_conversation_deleted");
}

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
  await assertPrivateGroveConversationNotDeleted(
    authorized.groveAdmin, authorized.groveUserId, projectId, conversationId,
  );
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
  /** Archive-only, never included on the legacy discovery route. */
  nextCursor?: string | null;
};
type ConversationArchiveScope = {
  groveUserId: string; fireflyUserId: string; projectId: string;
};
type ConversationArchiveKey = { updatedAt: string; conversationId: string };
const CONVERSATION_CURSOR_TTL_MS = 15 * 60 * 1000;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function assertArchiveKey(key: ConversationArchiveKey): void {
  if (!key || typeof key.updatedAt !== "string" ||
      key.updatedAt.length > 40 || !timestampPattern.test(key.updatedAt) ||
      !Number.isFinite(Date.parse(key.updatedAt)) ||
      typeof key.conversationId !== "string" || !validUuid.test(key.conversationId))
    throw new RouteAccessError(409, "grove_private_conversations_cursor_invalid");
}
function archiveSignature(payload: string, scope: ConversationArchiveScope, secret: string): string {
  const derived = createHmac("sha256", secret).update("grove-conversation-discovery-v1").digest();
  return createHmac("sha256", derived)
    .update([scope.groveUserId.toLowerCase(), scope.fireflyUserId.toLowerCase(),
      scope.projectId.toLowerCase(), payload].join(":"))
    .digest("hex");
}
function assertArchiveSecret(secret: string): void {
  if (typeof secret !== "string" || secret.length < 16)
    throw new RouteAccessError(500, "grove_private_conversations_unavailable");
}
/** Cursor only locates a page. Each request still requires fresh full owner authorization. */
export function issueGroveConversationArchiveCursor(input: {
  scope: ConversationArchiveScope; key: ConversationArchiveKey;
  secret: string; now?: number;
}): string {
  assertArchiveKey(input.key); assertArchiveSecret(input.secret);
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0)
    throw new RouteAccessError(500, "grove_private_conversations_unavailable");
  const payload = Buffer.from(JSON.stringify({
    v: 1, t: input.key.updatedAt,
    id: input.key.conversationId.toLowerCase(),
    exp: now + CONVERSATION_CURSOR_TTL_MS,
  }), "utf8").toString("base64url");
  return payload + "." + archiveSignature(payload, input.scope, input.secret);
}
export function readGroveConversationArchiveCursor(input: {
  scope: ConversationArchiveScope; cursor: string;
  secret: string; now?: number;
}): ConversationArchiveKey {
  assertArchiveSecret(input.secret);
  const reject = (): never => {
    throw new RouteAccessError(409, "grove_private_conversations_cursor_invalid");
  };
  if (typeof input.cursor !== "string" || input.cursor.length > 768 ||
      !/^[A-Za-z0-9_-]{1,640}\.[0-9a-f]{64}$/.test(input.cursor)) reject();
  const [payload, signature] = input.cursor.split(".");
  const expected = archiveSignature(payload, input.scope, input.secret);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) reject();
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { reject(); }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) reject();
  const data = decoded as Record<string, unknown>;
  const now = input.now ?? Date.now();
  if (data.v !== 1 || typeof data.exp !== "number" ||
      !Number.isSafeInteger(data.exp) || data.exp <= now ||
      data.exp > now + CONVERSATION_CURSOR_TTL_MS ||
      typeof data.t !== "string" || typeof data.id !== "string") reject();
  const key = { updatedAt: data.t as string, conversationId: data.id as string };
  assertArchiveKey(key);
  return key;
}
function compareArchiveTime(a: string, b: string): number {
  const whole = Date.parse(a) - Date.parse(b);
  if (whole) return whole;
  const remainder = (value: string): number => {
    const digits = /:\d{2}\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "";
    return Number(digits.padEnd(6, "0").slice(3) || "0");
  };
  return remainder(a) - remainder(b);
}

/**
 * Explicit NEW-conversation action, not a new conversation or memory system.
 * Reuses the existing Firefly conversations schema, but ONLY from the verified
 * Grove host after an active invitation, bridge, grant and Firefly project
 * ownership check. The browser supplies only the project UUID, never owner
 * identity, conversation UUID or a Firefly credential.
 *
 * This operation is separately feature-gated at its HTTP route. It is not
 * retry-idempotent: a lost response might leave one empty conversation.
 * NEVER auto-retry a creation request or claim exactly-once creation.
 */
export async function createPrivateGroveConversation(
  req: Request,
  projectId: string,
): Promise<GrovePrivateConversationChoice> {
  if (!validUuid.test(projectId))
    throw new RouteAccessError(404, "grove_invalid_project_scope");
  const authorized = await authorizedPrivateGroveProject(req, projectId);
  const { data, error } = await authorized.fireflyAdmin
    .from("conversations")
    .insert({
      user_id: authorized.fireflyUserId,
      project_id: projectId,
    })
    .select("id,user_id,project_id,created_at,updated_at")
    .single();
  if (error || !data ||
      data.user_id !== authorized.fireflyUserId ||
      data.project_id !== projectId ||
      typeof data.id !== "string" || !validUuid.test(data.id) ||
      typeof data.created_at !== "string" ||
      !Number.isFinite(Date.parse(data.created_at)) ||
      typeof data.updated_at !== "string" ||
      !Number.isFinite(Date.parse(data.updated_at))) {
    throw new RouteAccessError(500, "grove_private_conversation_create_unavailable");
  }
  // The new ID comes from the database; independently revalidate both the
  // current Grove grant and Firefly conversation ownership after insertion.
  // This narrows revocation races but is not cross-database atomicity.
  const current = await authorizePrivateGroveConversation(
    req, projectId, data.id,
  );
  if (current.groveUserId !== authorized.groveUserId ||
      current.fireflyUserId !== authorized.fireflyUserId ||
      current.projectId !== projectId ||
      current.conversationId !== data.id) {
    throw new RouteAccessError(403, "grove_private_access_changed");
  }
  return {
    conversationId: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Explicit, separately feature-gated owner action. This deletes only
 * private Grove transcript + claims, never Firefly messages or conversations.
 * The SQL proposal is transactional and leaves a durable resurrection fence.
 * NO browser/user/model may supply the owner or bypass full host auth. */
export async function deletePrivateGroveConversation(
  req: Request,
  projectId: string,
  conversationId: string,
): Promise<void> {
  if (process.env.GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED !== "true")
    throw new RouteAccessError(404, "grove_private_deletion_not_enabled");
  const authorized = await authorizePrivateGroveConversation(
    req, projectId, conversationId,
  );
  // A Grove-only DB tombstone cannot outlive an older physical DB snapshot.
  // Until independent durable custody is approved, HOLD even if someone
  // accidentally enables the deletion flag. No client/model can bypass it.
  const custodyScope = {
    groveUserId: authorized.groveUserId, projectId, conversationId,
  };
  const intent = await reserveIndependentGroveDeletion(custodyScope);
  const { data, error } = await authorized.groveAdmin.rpc(
    "grove_private_delete_conversation",
    {
      p_grove_user_id: authorized.groveUserId,
      p_project_id: projectId,
      p_conversation_id: conversationId,
    },
  );
  if (error || !data || typeof data !== "object" || Array.isArray(data) ||
      data.status !== "deleted" ||
      !Number.isSafeInteger(data.removedTurns) || data.removedTurns < 0) {
    throw new RouteAccessError(500, "grove_private_delete_not_confirmed");
  }
  // A successful DB RPC does not prove that the independent deletion
  // record is committed. Withhold HTTP success on missing custody readback.
  await confirmIndependentGroveDeletion(custodyScope, intent);
}

export async function readPrivateGroveConversations(
  req: Request,
  projectId: string,
  archive?: { enabled: true; cursor?: string },
): Promise<GrovePrivateConversationsResult> {
  if (!validUuid.test(projectId))
    throw new RouteAccessError(404, "grove_invalid_project_scope");
  const { fireflyAdmin, fireflyUserId, groveUserId, groveAdmin } =
    await authorizedPrivateGroveProject(req, projectId);
  const archiveScope = { groveUserId, fireflyUserId, projectId };
  const secret = archive?.enabled ? process.env.GROVE_SERVICE_ROLE_KEY ?? "" : "";
  const before = archive?.cursor
    ? readGroveConversationArchiveCursor({
        scope: archiveScope, cursor: archive.cursor, secret,
      }) : undefined;
  // Use a keyset before the ORDER/LIMIT, never an unbounded OFFSET.
  let query = fireflyAdmin.from("conversations")
    .select("id,user_id,project_id,created_at,updated_at")
    .eq("user_id", fireflyUserId)
    .eq("project_id", projectId);
  if (before) {
    query = query.or("updated_at.lt." + before.updatedAt +
      ",and(updated_at.eq." + before.updatedAt +
      ",id.lt." + before.conversationId + ")");
  }
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (error || !Array.isArray(data) || data.length > 21)
    throw new RouteAccessError(500, "grove_private_conversations_unavailable");
  // The shared Firefly conversation may remain after Grove-only deletion.
  // Once private Talk is enabled, an absent/failed tombstone schema HOLDS
  // discovery rather than accidentally resurrecting deleted Grove chats.
  // The 21st row is LOOKAHEAD, not part of the current archive page.
  // Always validate it, but never allow a cursor to skip a hidden raw row.
  const viewed = archive?.enabled ? data.slice(0, 20) : data;
  const hidden = new Set<string>();
  if ((process.env.GROVE_PRIVATE_CHAT_PREVIEW_ENABLED === "true" ||
       process.env.GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED === "true") &&
      viewed.length > 0) {
    const ids = viewed.map(row => row?.id);
    if (ids.some(id => typeof id !== "string" || !validUuid.test(id)))
      throw new RouteAccessError(500, "grove_private_delete_fence_unavailable");
    const { data: tombstones, error: tombstoneError } = await groveAdmin
      .from("grove_private_conversation_tombstones")
      .select("firefly_conversation_id")
      .eq("grove_user_id", groveUserId)
      .eq("firefly_project_id", projectId)
      .in("firefly_conversation_id", ids as string[]);
    if (tombstoneError || !Array.isArray(tombstones) ||
        tombstones.some(row => !row ||
          typeof row.firefly_conversation_id !== "string" ||
          !validUuid.test(row.firefly_conversation_id) ||
          !(ids as string[]).some(id => id.toLowerCase() ===
            row.firefly_conversation_id.toLowerCase()))) {
      throw new RouteAccessError(500, "grove_private_delete_fence_unavailable");
    }
    for (const row of tombstones)
      hidden.add(row.firefly_conversation_id.toLowerCase());
  }
  // Grant/bridge/Firefly ownership can change during this service-role read.
  // Revalidate before exposing even the conversation IDs or timestamps.
  const current = await authorizedPrivateGroveProject(req, projectId);
  if (current.groveUserId !== groveUserId ||
      current.fireflyUserId !== fireflyUserId ||
      current.projectId !== projectId)
    throw new RouteAccessError(403, "grove_private_access_changed");
  const seen = new Set<string>();
  const records: GrovePrivateConversationChoice[] = [];
  let previous: { updated_at: string; id: string } | null = null;
  for (const [index, row] of data.entries()) {
    if (!row || row.user_id !== fireflyUserId ||
        row.project_id !== projectId ||
        typeof row.id !== "string" || !validUuid.test(row.id) ||
        seen.has(row.id.toLowerCase()) ||
        typeof row.created_at !== "string" ||
        !Number.isFinite(Date.parse(row.created_at)) ||
        typeof row.updated_at !== "string" ||
        !Number.isFinite(Date.parse(row.updated_at)))
      throw new RouteAccessError(500, "grove_private_conversations_unavailable");
    seen.add(row.id.toLowerCase());
    if (archive?.enabled) {
      if (before) {
        const timeOrder = compareArchiveTime(row.updated_at, before.updatedAt);
        if (!(timeOrder < 0 || (timeOrder === 0 &&
            row.id.toLowerCase() < before.conversationId.toLowerCase())))
          throw new RouteAccessError(500, "grove_private_conversations_unavailable");
      }
      if (previous) {
        const timeOrder = compareArchiveTime(row.updated_at, previous.updated_at);
        if (!(timeOrder < 0 || (timeOrder === 0 &&
            row.id.toLowerCase() < previous.id.toLowerCase())))
          throw new RouteAccessError(500, "grove_private_conversations_unavailable");
      }
    }
    previous = row;
    if (hidden.has(row.id.toLowerCase()) || (archive?.enabled && index >= 20))
      continue;
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
    // 21st raw row or a tombstone near the front can hide older accessible
    // conversations; never claim a complete listing in that case.
    mayBeTruncated: archive?.enabled ? data.length > 20 :
      data.length > 20 || hidden.size > 0,
    ...(archive?.enabled ? { nextCursor: data.length > 20
      ? issueGroveConversationArchiveCursor({
          scope: archiveScope,
          key: { updatedAt: data[19].updated_at, conversationId: data[19].id },
          secret,
        }) : null } : {}),
  };
}
