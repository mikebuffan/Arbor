import type { SupabaseClient } from "@supabase/supabase-js";
import { preparePatternHopFromReviewPacket } from "./researchPatternHopBridge";
import { SupabaseInvestigationStore } from "./supabaseInvestigationStore";
import { SupabaseResearchStore } from "./supabaseResearchStore";
import { runResearchSessionTick, type ResearchUnitExecutor } from "./sessionRunner";

export type DocumentHopPayload = {
  review: Parameters<typeof preparePatternHopFromReviewPacket>[0];
  afterPageId?: string;
  limit?: number;
};

/** Internal executor for existing session claims. Search is a bounded unit,
 * never a finding verification or a new unattended research loop. */
export function createDocumentHopExecutor(input: {
  ownerId: string;
  projectId: string;
  documents: Pick<SupabaseInvestigationStore, "searchPreparedPatternHopPages">;
}): ResearchUnitExecutor {
  return async ({ session, claim, at }) => {
    if (session.userId !== input.ownerId || session.projectId !== input.projectId)
      throw new Error("research_owner_scope_mismatch");
    if (!session.authorized || session.cancellationRequested)
      throw new Error("document_hop_authorization_required");
    if (claim.kind !== "document_pattern_hop_search") throw new Error("unsupported_document_hop_unit");
    const payload = claim.payload as DocumentHopPayload;
    if (Object.keys(payload).some(k => !["review", "afterPageId", "limit"].includes(k)) ||
        !payload.review || typeof payload.review !== "object" ||
        (payload.afterPageId !== undefined && typeof payload.afterPageId !== "string"))
      throw new Error("invalid_document_hop_payload");
    const limit = payload.limit ?? 20;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20)
      throw new Error("document_hop_batch_limit");
    // Rebuild through review validation instead of trusting stored prepared flags.
    const candidate = preparePatternHopFromReviewPacket(payload.review);
    const batch = await input.documents.searchPreparedPatternHopPages({
      candidate, limit, ...(payload.afterPageId === undefined ? {} : { afterPageId: payload.afterPageId }),
    });
    return {
      sessionId: session.id, unitId: claim.unitId, idempotencyKey: claim.idempotencyKey,
      status: "completed", recordedAt: at, costCents: 0,
      // Discovery does not satisfy required evidence review or promote evidence
      // into the session's completed-evidence ledger.
      evidenceRefs: [], unresolvedRequiredWork: session.unresolvedRequiredWork,
      result: { version: 1, completionScope: "bounded_document_search_batch",
        preparedLead: candidate,
        requestedQuery: candidate.seed.requestedQuery,
        afterPageId: payload.afterPageId ?? null, ...batch },
    };
  };
}

/** Trusted host entry point, disabled by default. Owner/project must already
 * be authorized by the host. Existing deployment/integration gates still apply.
 * No route, cron, enqueue, provider call or historical-memory submission. */
export async function runStoredDocumentHopTick(input: {
  db: SupabaseClient; ownerId: string; projectId: string; workerId: string;
  sessionId: string; unitId: string; at: string; enabled?: boolean;
}) {
  if (input.enabled !== true) throw new Error("stored_document_hops_disabled");
  if (!input.unitId) throw new Error("document_hop_unit_required");
  const store = new SupabaseResearchStore(input.db, input.ownerId, input.projectId, input.workerId, input.unitId);
  const saved = await store.loadUnitResult(input.sessionId, input.unitId, true);
  if (saved) {
    if (saved.completionScope !== "bounded_document_search_batch") throw new Error("document_hop_receipt_kind_mismatch");
    return { status: "replayed" as const, result: saved };
  }
  const documents = new SupabaseInvestigationStore(input.db, input.ownerId, input.projectId);
  return runResearchSessionTick({ sessionId: input.sessionId, at: input.at, store,
    executor: createDocumentHopExecutor({ ownerId: input.ownerId, projectId: input.projectId, documents }) });
}
