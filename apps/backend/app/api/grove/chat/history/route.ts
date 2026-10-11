import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  authorizePrivateGroveConversation,
} from "@/lib/grove/privateReadBroker";
import { grovePrivateTurnFeatures } from "@/lib/grove/privateConversationLoop";
import {
  createSupabaseGrovePrivateTranscriptStore,
  issueGrovePrivateHistoryCursor, readGrovePrivateHistoryCursor,
} from "@/lib/grove/privateTranscriptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  page: z.literal("archive").optional(),
  cursor: z.string().min(1).max(768).optional(),
}).strict().refine(values => !values.cursor || values.page === "archive");

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });

/**
 * Private history is returned ONLY after a fresh Grove JWT verification,
 * invitation, revocable account mapping, explicit project grant AND exact
 * Firefly conversation ownership check. The Grove service role is server-only.
 *
 * No public Firefly message table. No browser-provided owner, roles, context,
 * model-output claims or cross-conversation fallbacks. Feature OFF => 404,
 * before any database client or user-supplied identifier is processed.
 *
 * Six latest complete pairs are the current read window; no misleading
 * assertion that this is a full archive or that a model executed ARK work.
 */
export async function GET(req: Request) {
  const flags = grovePrivateTurnFeatures();
  if (!flags.chatEnabled || !flags.transcriptEnabled) {
    return json({ ok: false, error: "grove_private_history_not_enabled" }, 404);
  }
  try {
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        return json({ ok: false, error: "grove_private_history_scope_invalid" }, 400);
      }
      params[key] = value;
    }
    const scope = querySchema.parse(params);
    const authorized = await authorizePrivateGroveConversation(
      req, scope.projectId, scope.conversationId,
    );
    if (authorized.projectId !== scope.projectId ||
        authorized.conversationId !== scope.conversationId ||
        authorized.access !== "read-only")
      throw new RouteAccessError(403, "grove_private_scope_rejected");
    const store = createSupabaseGrovePrivateTranscriptStore(authorized.groveAdmin);
    const storeScope = {
      groveUserId: authorized.groveUserId,
      projectId: scope.projectId,
      conversationId: scope.conversationId,
    };
    // Historical browsing never expands the bounded six-pair LM context.
    // Legacy phone reads retain their original window and response shape.
    const archive = scope.page === "archive";
    const secret = archive ? process.env.GROVE_SERVICE_ROLE_KEY ?? "" : "";
    const before = archive && scope.cursor
      ? readGrovePrivateHistoryCursor({
          scope: storeScope, cursor: scope.cursor, secret,
        }) : undefined;
    if (archive && !store.listHistoryPage)
      throw new RouteAccessError(500, "grove_private_history_unavailable");
    const page = archive ? await store.listHistoryPage!(storeScope, before) : null;
    const rows = page ? page.rows : await store.listRecent(storeScope);
    if (!Array.isArray(rows) || rows.length > 6 ||
        (page && (typeof page.hasMore !== "boolean" ||
          (page.hasMore && rows.length !== 6))))
      throw new RouteAccessError(500, "grove_private_history_unavailable");
    // If the Grove invitation, owner mapping, project grant or Firefly
    // conversation is revoked WHILE this private read is running, fail closed
    // rather than return its private content from a stale service-role read.
    const current = await authorizePrivateGroveConversation(
      req, scope.projectId, scope.conversationId,
    );
    if (current.access !== "read-only" ||
        current.groveUserId !== authorized.groveUserId ||
        current.fireflyUserId !== authorized.fireflyUserId ||
        current.projectId !== scope.projectId ||
        current.conversationId !== scope.conversationId)
      throw new RouteAccessError(403, "grove_private_access_changed");
    return json({
      ok: true,
      projectId: scope.projectId,
      conversationId: scope.conversationId,
      // Newest-first complete pairs; UI reverses them to display a timeline.
      order: "newest_first",
      windowLimit: 6,
      historyMayBeTruncated: page ? page.hasMore : rows.length === 6,
      ...(archive ? { nextCursor: page!.hasMore
        ? issueGrovePrivateHistoryCursor({
            scope: storeScope,
            key: { createdAt: rows[rows.length - 1].created_at,
              requestId: rows[rows.length - 1].request_id },
            secret,
          }) : null } : {}),
      turns: rows.map(row => ({
        requestId: row.request_id,
        userText: row.user_text,
        assistantText: row.assistant_text,
        replyVerification: row.reply_verification,
        createdAt: row.created_at,
      })),
      liveExecutionVerified: false,
      workReceipts: [],
      grantsExecution: false,
    }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ ok: false, error: "grove_private_history_scope_invalid" }, 400);
    }
    if (error instanceof RouteAccessError) {
      return json({ ok: false, error: error.code }, error.status);
    }
    // Don't reveal provider, SQL, token, project, credential or message text.
    return json({ ok: false, error: "grove_private_history_unavailable" }, 500);
  }
}
