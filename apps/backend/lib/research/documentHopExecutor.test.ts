import { describe, expect, it, vi } from "vitest";
import { runStoredDocumentHopTick, type DocumentHopPayload } from "./documentHopExecutor";
import { SupabaseResearchStore } from "./supabaseResearchStore";
import { validateResearchUnitResult } from "./unitResult";

const pageId = "33333333-3333-4333-8333-333333333333";
const review: DocumentHopPayload["review"] = {
  candidateId: "lead", objective: "Compare original calendars", maxDepth: 2, maxHopsPerAttempt: 3,
  directive: { directiveId: "compare", triggerEvidenceRefs: ["page:original"], reason: "Resolve calendar discrepancy",
    targetQuery: "calendar travel", stoppingCondition: "Original calendar and identity review" },
  packet: { packetId: "packet", title: "Synthetic calendar", source: { documentId: "original", physicalPage: 1,
    originalBytesSha256: "c".repeat(64), pageHash: "d".repeat(64), sourceRefs: ["page:original"] },
    extractedText: "calendar", ocr: null, tableCandidates: [], identityCandidates: [], contradictions: [],
    releaseVariants: [], visualAssets: [], privacyFlagIds: [], publicationStatus: "hold" },
};
function harness(payload: Record<string, unknown> = { review, limit: 1 }) {
  let saved: any = null;
  const session = { id: "session", user_id: "owner", project_id: "project", objective: "calendar",
    status: "running", started_at: "2026-10-06T00:00:00Z", deadline_at: "2026-10-06T01:00:00Z",
    max_work_units: 5, consumed_work_units: 0, max_cost_cents: 100, committed_cost_cents: 0,
    authorized: true, cancellation_requested: false, unresolved_required_work: 3, completed_evidence_refs: [] };
  const page = { id: pageId, owner_id: "owner", project_id: "project", document_id: "doc", physical_page: 2,
    exact_sha256: "b".repeat(64), extraction_text: "calendar travel", extraction_status: "text_layer", review_status: "hold" };
  const queries: any[] = [];
  const from = vi.fn((table: string) => {
    const q: any = {};
    for (const k of ["select", "eq", "in", "or", "order", "gt", "limit"]) q[k] = vi.fn(() => q);
    const answer = () => ({ data: table === "arbor_research_sessions" ? session :
      table === "arbor_research_receipts" ? saved : table === "arbor_research_pages" ?
      [page, { ...page, id: "44444444-4444-4444-8444-444444444444" }] :
      [{ id: "doc", owner_id: "owner", project_id: "project", document_key: "calendar",
        source_uri: "https://example.org/calendar.pdf", original_bytes_sha256: "a".repeat(64) }], error: null });
    q.maybeSingle = vi.fn(async () => answer());
    q.then = (resolve: any) => Promise.resolve(answer()).then(resolve);
    queries.push({ table, q }); return q;
  });
  const rpc = vi.fn(async (name: string, args: any) => {
    if (name === "arbor_claim_research_unit") return { data: { unitId: "unit", leaseToken: "lease", idempotencyKey: "key",
      kind: "document_pattern_hop_search", payload, maxCostReservationCents: 0 }, error: null };
    if (name === "arbor_settle_research_unit") {
      saved = JSON.parse(JSON.stringify({ session_id: args.p_session_id, unit_id: args.p_unit_id,
        user_id: args.p_user_id, project_id: args.p_project_id, result: args.p_result }));
      return { data: "committed", error: null };
    }
    return { data: true, error: null };
  });
  return { db: { from, rpc } as never, from, rpc, queries, session, saved: () => saved,
    leak: () => { saved.user_id = "foreign"; } };
}
const invocation = { ownerId: "owner", projectId: "project", workerId: "worker", sessionId: "session",
  at: "2026-10-06T00:10:00Z", enabled: true };

describe("stored document hop session integration", () => {
  it("runs real review validation/search/ranking and reloads JSON receipts in a fresh adapter", async () => {
    const h = harness();
    const result = await runStoredDocumentHopTick({ ...invocation, db: h.db });
    expect(result.status).toBe("committed");
    const restarted = new SupabaseResearchStore(h.db, "owner", "project", "new-worker");
    const checkpoint = await restarted.loadUnitResult("session", "unit");
    expect(checkpoint).toMatchObject({ completionScope: "bounded_document_search_batch", nextPageId: pageId,
      preparedLead: { provenance: { pageHash: "d".repeat(64) }, executionRequested: false },
      hits: [{ recordId: pageId, pageHash: "b".repeat(64), source: { pdfPage: 2, sha256: "a".repeat(64) }, findingVerified: false }] });
    const settle = h.rpc.mock.calls.find(([name]) => name === "arbor_settle_research_unit")![1];
    expect(settle).toMatchObject({ p_unresolved_required_work: 3, p_evidence_refs: [], p_cost_cents: 0 });
    expect(h.rpc).toHaveBeenCalledTimes(2); // Readback cannot execute or enqueue another unit.
    const read = h.queries.find(x => x.table === "arbor_research_receipts").q;
    expect(read.eq.mock.calls).toEqual([["session_id", "session"], ["unit_id", "unit"], ["user_id", "owner"], ["project_id", "project"]]);
    h.leak();
    await expect(restarted.loadUnitResult("session", "unit")).rejects.toThrow("scope_mismatch");
  });
  it("defaults off before touching storage", async () => {
    const h = harness();
    await expect(runStoredDocumentHopTick({ ...invocation, db: h.db, enabled: undefined })).rejects.toThrow("disabled");
    expect(h.from).not.toHaveBeenCalled(); expect(h.rpc).not.toHaveBeenCalled();
  });
  it("stops cancelled sessions before claiming or searching", async () => {
    const h = harness(); h.session.cancellation_requested = true;
    expect(await runStoredDocumentHopTick({ ...invocation, db: h.db })).toMatchObject({ status: "stopped", reason: "cancelled_by_owner" });
    expect(h.rpc).not.toHaveBeenCalledWith("arbor_claim_research_unit", expect.anything());
    expect(h.from).toHaveBeenCalledTimes(1);
  });
  it("rejects invented review triggers, oversized batches and scope overrides without settlement", async () => {
    for (const payload of [{ review, limit: 21 }, { review, ownerId: "foreign" },
      { review: { ...review, directive: { ...review.directive, triggerEvidenceRefs: ["invented"] } } }]) {
      const h = harness(payload);
      await expect(runStoredDocumentHopTick({ ...invocation, db: h.db })).rejects.toThrow();
      expect(h.rpc.mock.calls.map(([name]) => name)).toEqual(["arbor_claim_research_unit"]);
      expect(h.from).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects lossy, cyclic and oversized result data before persistence", () => {
    const cycle: any = {}; cycle.self = cycle;
    for (const invalid of [cycle, { a: undefined }, { a: NaN }, { a: new Date() }, { a: "x".repeat(262145) }])
      expect(() => validateResearchUnitResult(invalid)).toThrow();
    expect(() => validateResearchUnitResult({ cursor: pageId, hashes: ["a".repeat(64)], missing: null })).not.toThrow();
  });
});
