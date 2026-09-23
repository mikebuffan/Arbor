import "server-only";

import { createHash } from "node:crypto";
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
 * completed an ARK task. Concurrent model calls may occur, but the DB unique
 * key chooses ONE persisted response. Inference itself is not exactly-once.
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
export type GrovePrivateTranscriptStore = {
  getCompleted(input: GrovePrivateTranscriptScope & {
    requestId: string;
  }): Promise<GrovePrivateTranscriptRow | null>;
  /** Atomic across workers, only after owner/conversation/project verification.
   * Requires separately approved Grove-only pending-claim migration. */
  claimPending(input: GrovePrivateTranscriptScope & {
    requestId: string; userText: string;
  }): Promise<"claimed" | "in_progress" | "conflict" | "no_access">;
  listRecent(scope: GrovePrivateTranscriptScope): Promise<GrovePrivateTranscriptRow[]>;
  persistCompleted(input: GrovePrivateTranscriptScope & {
    requestId: string;
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
function assertRow(row: GrovePrivateTranscriptRow, scope: GrovePrivateTranscriptScope): void {
  if (!row || row.grove_user_id !== scope.groveUserId ||
      row.firefly_project_id !== scope.projectId ||
      row.firefly_conversation_id !== scope.conversationId ||
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
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "23505";
}
function assertSameRequest(
  row: GrovePrivateTranscriptRow, input: { requestId: string; userText: string },
): void {
  if (row.request_id !== input.requestId || row.user_text !== input.userText)
    conflict();
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
      if (!["claimed", "in_progress", "conflict", "no_access"]
          .includes(data as string))
        throw new RouteAccessError(409, "grove_transcript_claim_invalid");
      return data as "claimed" | "in_progress" | "conflict" | "no_access";
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
    async persistCompleted(input) {
      assertScope(input);
      assertRequestId(input.requestId);
      if (typeof input.userText !== "string" ||
          !input.userText.trim() || input.userText.length > 3000 ||
          !input.reply || typeof input.reply.reply !== "string" ||
          !input.reply.reply.trim() || input.reply.reply.length > 20000 ||
          input.reply.liveExecutionVerified !== false ||
          input.reply.workReceipts.length !== 0 ||
          !["unverified_model_text", "known_action_claim_filtered"]
            .includes(input.reply.replyVerification))
        throw new RouteAccessError(409, "grove_transcript_reply_invalid");
      const existing = await store.getCompleted(input);
      if (existing) {
        assertSameRequest(existing, input);
        return { row: existing, created: false };
      }
      const { error } = await groveServiceClient.from("grove_private_turns").insert({
        grove_user_id: input.groveUserId,
        firefly_project_id: input.projectId,
        firefly_conversation_id: input.conversationId,
        request_id: input.requestId,
        user_text: input.userText,
        assistant_text: input.reply.reply,
        reply_verification: input.reply.replyVerification,
        ark_connected: input.reply.arkConnected,
        continuity_fetched: input.reply.continuityFetched,
      });
      if (error && !isUniqueViolation(error)) throw error;
      // Even after a successful write, read back the exact scoped record.
      // A conflicting concurrent writer wins once and both callers converge.
      const saved = await store.getCompleted(input);
      if (!saved) throw new Error("grove_transcript_commit_unreadable");
      assertSameRequest(saved, input);
      return { row: saved, created: !error };
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
  if (input.completedNewestFirst.length > 6)
    throw new Error("grove_transcript_history_limit");
  for (const row of input.completedNewestFirst) {
    assertRow(row, input.scope);
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
