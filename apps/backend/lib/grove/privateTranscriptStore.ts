import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import type {
  GroveHostTextTurn, GroveLmUnverifiedReply,
} from "@/lib/grove/privateLmHostTransport";

/**
 * Private Grove transcript belongs to GROVE Supabase, never Firefly's public
 * messages table. The caller must ALREADY have passed Grove Auth, invitation,
 * bridge, explicit project grant, and exact Firefly conversation ownership.
 *
 * This store accepts a server-created or client-generated REQUEST ID only as
 * an idempotency label. It must never accept a client-chosen owner or authorize
 * access on the basis of a request ID. All queries include the verified scope.
 *
 * Writes only COMPLETE pairs after the strict private LM receiver succeeds.
 * This avoids orphaned user turns and never claims an unverified LM response
 * completed an ARK task. A DB claim and fenced completion prevent stale workers from persisting.
 * A 240-second lease can be reclaimed, so inference itself is not exactly-once.
 */
export type GrovePrivateTranscriptScope = {
  groveUserId: string;
  projectId: string;
  conversationId: string;
};
export type GrovePrivateTranscriptRow = {
  grove_user_id: string;
  firefly_project_id: string;
  firefly_conversation_id: string;
  request_id: string;
  user_text: string;
  assistant_text: string;
  reply_verification: "unverified_model_text" | "known_action_claim_filtered";
  ark_connected: boolean;
  continuity_fetched: boolean;
  created_at: string;
};
export type GrovePrivateHistoryKey = {
  createdAt: string;
  requestId: string;
};
export type GrovePrivateHistoryPage = {
  rows: GrovePrivateTranscriptRow[];
  hasMore: boolean;
};

/** Archive pagination is deliberately separate from the six-pair model context. */
export type GrovePrivateTranscriptStore = {
  getCompleted(input: GrovePrivateTranscriptScope & {
    requestId: string;
  }): Promise<GrovePrivateTranscriptRow | null>;
  /** Atomic across workers, only after owner/conversation/project verification.
   * Requires separately approved Grove-only pending-claim migration. */
  claimPending(input: GrovePrivateTranscriptScope & {
    requestId: string; userText: string;
  }): Promise<
    | { status: "claimed"; leaseToken: string }
    | { status: "in_progress" | "conflict" | "no_access" | "completed" }
  >;
  listRecent(scope: GrovePrivateTranscriptScope): Promise<GrovePrivateTranscriptRow[]>;
  /** Archive-only, not model context. An absent adapter must fail closed. */
  listHistoryPage?(scope: GrovePrivateTranscriptScope, before?: GrovePrivateHistoryKey):
    Promise<GrovePrivateHistoryPage>;
  persistCompleted(input: GrovePrivateTranscriptScope & {
    requestId: string;
    /** Must be the current DB-issued claim token; never browser-provided. */
    leaseToken: string;
    userText: string;
    reply: GroveLmUnverifiedReply;
  }): Promise<{ row: GrovePrivateTranscriptRow; created: boolean }>;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = "grove_user_id,firefly_project_id,firefly_conversation_id,request_id,user_text,assistant_text,reply_verification,ark_connected,continuity_fetched,created_at";
function assertScope(scope: GrovePrivateTranscriptScope): void {
  if (![scope.groveUserId, scope.projectId, scope.conversationId]
    .every(x => typeof x === "string" && uuid.test(x)))
    throw new RouteAccessError(409, "grove_transcript_scope_invalid");
}
function assertRequestId(requestId: string): void {
  if (typeof requestId !== "string" || !uuid.test(requestId))
    throw new RouteAccessError(409, "grove_transcript_request_invalid");
}
/** PostgreSQL UUID columns round-trip as lower case, while validated caller
 * UUIDs can legally use upper case. Normalize identity only for comparison. */
function sameUuid(a: unknown, b: string): boolean {
  return typeof a === "string" && uuid.test(a) && uuid.test(b) &&
    a.toLowerCase() === b.toLowerCase();
}
function assertRow(row: GrovePrivateTranscriptRow, scope: GrovePrivateTranscriptScope): void {
  if (!row || !sameUuid(row.grove_user_id, scope.groveUserId) ||
      !sameUuid(row.firefly_project_id, scope.projectId) ||
      !sameUuid(row.firefly_conversation_id, scope.conversationId) ||
      !uuid.test(row.request_id) ||
      typeof row.user_text !== "string" ||
      !row.user_text.trim() || row.user_text.length > 3000 ||
      typeof row.assistant_text !== "string" ||
      !row.assistant_text.trim() || row.assistant_text.length > 20000 ||
      !["unverified_model_text", "known_action_claim_filtered"]
        .includes(row.reply_verification) ||
      typeof row.ark_connected !== "boolean" ||
      typeof row.continuity_fetched !== "boolean" ||
      !Number.isFinite(Date.parse(row.created_at)))
    throw new RouteAccessError(409, "grove_transcript_scope_invalid");
}
function conflict(): never {
  throw new RouteAccessError(409, "grove_transcript_request_conflict");
}
function assertSameRequest(
  row: GrovePrivateTranscriptRow, input: { requestId: string; userText: string },
): void {
  if (!sameUuid(row.request_id, input.requestId) || row.user_text !== input.userText)
    conflict();
}

const historyTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const HISTORY_CURSOR_MS = 15 * 60 * 1000;
function assertHistoryKey(key: GrovePrivateHistoryKey): void {
  if (!key || typeof key.createdAt !== "string" ||
      key.createdAt.length > 40 || !historyTimestamp.test(key.createdAt) ||
      !Number.isFinite(Date.parse(key.createdAt)) ||
      typeof key.requestId !== "string" || !uuid.test(key.requestId))
    throw new RouteAccessError(409, "grove_private_history_cursor_invalid");
}
function historyCursorSignature(
  encoded: string, scope: GrovePrivateTranscriptScope, secret: string,
): string {
  // A separately domain-separated HMAC derived from an EXISTING server-only
  // Grove key. The cursor never carries the key or exposes saved text.
  const derived = createHmac("sha256", secret)
    .update("grove-private-history-cursor-v1").digest();
  return createHmac("sha256", derived)
    .update([scope.groveUserId.toLowerCase(), scope.projectId.toLowerCase(),
      scope.conversationId.toLowerCase(), encoded].join(":"))
    .digest("hex");
}
function assertCursorSecret(secret: string): void {
  if (typeof secret !== "string" || secret.length < 16)
    throw new RouteAccessError(500, "grove_private_history_unavailable");
}
/** 15-minute scoped, tamper-evident cursor; not an authorization credential. */
export function issueGrovePrivateHistoryCursor(input: {
  scope: GrovePrivateTranscriptScope; key: GrovePrivateHistoryKey;
  secret: string; now?: number;
}): string {
  assertScope(input.scope);
  assertHistoryKey(input.key);
  assertCursorSecret(input.secret);
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0)
    throw new RouteAccessError(500, "grove_private_history_unavailable");
  const body = Buffer.from(JSON.stringify({
    v: 1, t: input.key.createdAt, r: input.key.requestId.toLowerCase(),
    exp: now + HISTORY_CURSOR_MS,
  }), "utf8").toString("base64url");
  return body + "." + historyCursorSignature(body, input.scope, input.secret);
}
export function readGrovePrivateHistoryCursor(input: {
  scope: GrovePrivateTranscriptScope; cursor: string;
  secret: string; now?: number;
}): GrovePrivateHistoryKey {
  assertScope(input.scope);
  assertCursorSecret(input.secret);
  const reject = (): never => {
    throw new RouteAccessError(409, "grove_private_history_cursor_invalid");
  };
  if (typeof input.cursor !== "string" || input.cursor.length > 768 ||
      !/^[A-Za-z0-9_-]{1,640}\.[0-9a-f]{64}$/.test(input.cursor)) reject();
  const [encoded, signature] = input.cursor.split(".");
  const expected = historyCursorSignature(encoded, input.scope, input.secret);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")))
    reject();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch { reject(); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) reject();
  const data = parsed as Record<string, unknown>;
  const now = input.now ?? Date.now();
  if (data.v !== 1 || typeof data.exp !== "number" ||
      !Number.isSafeInteger(data.exp) || data.exp <= now ||
      data.exp > now + HISTORY_CURSOR_MS || typeof data.t !== "string" ||
      typeof data.r !== "string") reject();
  const key = { createdAt: data.t as string, requestId: data.r as string };
  assertHistoryKey(key);
  return key;
}

/** Compare PostgreSQL timestamps to microsecond precision, not JS millisecond
 * precision. Equal-millisecond rows must not be skipped in archive paging. */
function compareHistoryTimes(a: string, b: string): number {
  const whole = Date.parse(a) - Date.parse(b);
  if (whole) return whole;
  const microRemainder = (value: string): number => {
    const fraction = /:\d{2}\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "";
    return Number(fraction.padEnd(6, "0").slice(3) || "0");
  };
  return microRemainder(a) - microRemainder(b);
}

function scopedQuery(supabase: SupabaseClient, scope: GrovePrivateTranscriptScope) {
  return supabase.from("grove_private_turns")
    .select(fields)
    .eq("grove_user_id", scope.groveUserId)
    .eq("firefly_project_id", scope.projectId)
    .eq("firefly_conversation_id", scope.conversationId);
}

export function createSupabaseGrovePrivateTranscriptStore(
  groveServiceClient: SupabaseClient,
): GrovePrivateTranscriptStore {
  const store: GrovePrivateTranscriptStore = {
    async getCompleted(input) {
      assertScope(input);
      assertRequestId(input.requestId);
      const { data, error } = await scopedQuery(groveServiceClient, input)
        .eq("request_id", input.requestId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      assertRow(data as GrovePrivateTranscriptRow, input);
      // A scoped query does not justify trusting a stale/misrouted provider
      // result. Never replay a different request ID, even with identical text.
      if (!sameUuid((data as GrovePrivateTranscriptRow).request_id, input.requestId))
        conflict();
      return data as GrovePrivateTranscriptRow;
    },
    async claimPending(input) {
      assertScope(input);
      assertRequestId(input.requestId);
      if (typeof input.userText !== "string" ||
          !input.userText.trim() || input.userText.length > 3000)
        throw new RouteAccessError(409, "grove_transcript_reply_invalid");
      const digest = createHash("sha256")
        .update(input.userText, "utf8").digest("hex");
      const { data, error } = await groveServiceClient.rpc(
        "grove_private_claim_turn", {
          p_grove_user_id: input.groveUserId,
          p_project_id: input.projectId,
          p_conversation_id: input.conversationId,
          p_request_id: input.requestId,
          p_user_text_sha256: digest,
        },
      );
      if (error) throw error; // Missing live migration fails CLOSED.
      // Never accept a caller-supplied token or an unknown response from an
      // unreviewed/stale migration. Only PostgreSQL mints the lease token.
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new RouteAccessError(409, "grove_transcript_claim_invalid");
      const result = data as Record<string, unknown>;
      if (result.status === "claimed" && typeof result.leaseToken === "string" &&
          uuid.test(result.leaseToken))
        return { status: "claimed", leaseToken: result.leaseToken };
      if (["in_progress","conflict","no_access","completed"].includes(
          String(result.status)) && result.leaseToken === undefined)
        return { status: result.status as
          "in_progress" | "conflict" | "no_access" | "completed" };
      throw new RouteAccessError(409, "grove_transcript_claim_invalid");
    },
    async listRecent(scope) {
      assertScope(scope);
      const { data, error } = await scopedQuery(groveServiceClient, scope)
        .order("created_at", { ascending: false })
        .order("request_id", { ascending: false })
        .limit(6);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("grove_transcript_read_invalid");
      const rows = data as GrovePrivateTranscriptRow[];
      for (const row of rows) assertRow(row, scope);
      return rows;
    },
    async listHistoryPage(scope, before) {
      assertScope(scope);
      if (before) assertHistoryKey(before);
      let query = scopedQuery(groveServiceClient, scope);
      if (before) {
        // Strictly validated / signed keyset, ordered by both fields. No
        // offset drift if a new conversation turn arrives during pagination.
        query = query.or("created_at.lt." + before.createdAt +
          ",and(created_at.eq." + before.createdAt +
          ",request_id.lt." + before.requestId + ")");
      }
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("request_id", { ascending: false })
        .limit(7);
      if (error) throw error;
      if (!Array.isArray(data) || data.length > 7)
        throw new Error("grove_private_history_invalid");
      const rows = data as GrovePrivateTranscriptRow[];
      const seen = new Set<string>();
      let previous: GrovePrivateTranscriptRow | null = null;
      for (const row of rows) {
        assertRow(row, scope);
        const id = row.request_id.toLowerCase();
        if (seen.has(id)) throw new Error("grove_private_history_duplicate");
        seen.add(id);
        if (before) {
          const timeOrder = compareHistoryTimes(row.created_at, before.createdAt);
          if (!(timeOrder < 0 || (timeOrder === 0 &&
              id < before.requestId.toLowerCase())))
            throw new Error("grove_private_history_page_out_of_range");
        }
        if (previous) {
          const timeOrder = compareHistoryTimes(row.created_at, previous.created_at);
          if (!(timeOrder < 0 || (timeOrder === 0 &&
              id < previous.request_id.toLowerCase())))
            throw new Error("grove_private_history_page_out_of_order");
        }
        previous = row;
      }
      return { rows: rows.slice(0, 6), hasMore: rows.length > 6 };
    },
    async persistCompleted(input) {
      assertScope(input);
      assertRequestId(input.requestId);
      if (typeof input.leaseToken !== "string" ||
          !uuid.test(input.leaseToken) ||
          typeof input.userText !== "string" ||
          !input.userText.trim() || input.userText.length > 3000 ||
          !input.reply || typeof input.reply.reply !== "string" ||
          !input.reply.reply.trim() || input.reply.reply.length > 20000 ||
          input.reply.liveExecutionVerified !== false ||
          !Array.isArray(input.reply.workReceipts) ||
          input.reply.workReceipts.length !== 0 ||
          !["unverified_model_text", "known_action_claim_filtered"]
            .includes(input.reply.replyVerification) ||
          typeof input.reply.arkConnected !== "boolean" ||
          typeof input.reply.continuityFetched !== "boolean")
        throw new RouteAccessError(409, "grove_transcript_reply_invalid");
      const { data, error } = await groveServiceClient.rpc(
        "grove_private_complete_turn", {
          p_grove_user_id: input.groveUserId,
          p_project_id: input.projectId,
          p_conversation_id: input.conversationId,
          p_request_id: input.requestId,
          p_lease_token: input.leaseToken,
          p_user_text: input.userText,
          p_assistant_text: input.reply.reply,
          p_reply_verification: input.reply.replyVerification,
          p_ark_connected: input.reply.arkConnected,
          p_continuity_fetched: input.reply.continuityFetched,
        },
      );
      if (error) throw error; // Migration absent = HOLD; never direct INSERT.
      if (data === "stale" || data === "no_access")
        throw new RouteAccessError(403, "grove_private_claim_lost");
      if (data === "conflict")
        conflict();
      if (data !== "created" && data !== "replayed")
        throw new RouteAccessError(409, "grove_transcript_completion_invalid");
      const saved = await store.getCompleted(input);
      if (!saved) throw new Error("grove_transcript_commit_unreadable");
      assertSameRequest(saved, input);
      return { row: saved, created: data === "created" };
    },
  };
  return store;
}

/** Deterministically rebuild only complete, scoped pairs in chronological
 * order. Context is bounded to the signed Python receiver's 13-message /
 * 12k-character contract and NEVER exposes a stored row as instructions. */
export function selectPrivateModelHistory(input: {
  completedNewestFirst: readonly GrovePrivateTranscriptRow[];
  scope: GrovePrivateTranscriptScope;
  userText: string;
}): GroveHostTextTurn[] {
  assertScope(input.scope);
  if (typeof input.userText !== "string" ||
      !input.userText.trim() || input.userText.length > 3000)
    throw new RouteAccessError(409, "grove_transcript_reply_invalid");
  const selected: Array<{ user: string; assistant: string }> = [];
  let budget = 12000 - input.userText.length;
  if (!Array.isArray(input.completedNewestFirst) ||
      input.completedNewestFirst.length > 6)
    throw new Error("grove_transcript_history_limit");
  // Never silently trust a history adapter's order. A swapped pair would
  // reverse cause and response after restart, even though each row is valid.
  // Validate ALL six possible rows before truncating for the model budget.
  const seenRequests = new Set<string>();
  let newestToOldest = Number.POSITIVE_INFINITY;
  for (const row of input.completedNewestFirst) {
    assertRow(row, input.scope);
    // A repeated source pair must not become two independent LM memories.
    const requestKey = row.request_id.toLowerCase();
    if (seenRequests.has(requestKey))
      throw new Error("grove_transcript_history_duplicate_request");
    seenRequests.add(requestKey);
    const observed = Date.parse(row.created_at);
    if (observed > newestToOldest)
      throw new Error("grove_transcript_history_out_of_order");
    newestToOldest = observed;
  }
  for (const row of input.completedNewestFirst) {
    // Preserve the latest context before older context. Truncation is for
    // the LM-only context window, never the durable stored record.
    const user = row.user_text.slice(0, 3000);
    const assistant = row.assistant_text.slice(0, 3000);
    if (user.length + assistant.length > budget) break;
    selected.push({ user, assistant });
    budget -= user.length + assistant.length;
  }
  const messages: GroveHostTextTurn[] = [];
  for (const pair of selected.reverse()) {
    messages.push({ role: "user", content: pair.user },
      { role: "assistant", content: pair.assistant });
  }
  messages.push({ role: "user", content: input.userText });
  return messages;
}

export function transcriptRowToUnverifiedReply(
  row: GrovePrivateTranscriptRow,
  scope: GrovePrivateTranscriptScope,
): GroveLmUnverifiedReply {
  assertRow(row, scope);
  return {
    reply: row.assistant_text,
    model: "arbor-lm-v0.3",
    replyVerification: row.reply_verification,
    arkConnected: row.ark_connected,
    continuityFetched: row.continuity_fetched,
    liveExecutionVerified: false,
    workReceipts: [],
  };
}
