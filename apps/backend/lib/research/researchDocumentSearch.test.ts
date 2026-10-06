import { describe, expect, it, vi } from "vitest";
import { SupabaseInvestigationStore } from "./supabaseInvestigationStore";
import type { DocumentHopSearch } from "./researchDocumentSearch";
const page = { id: "33333333-3333-4333-8333-333333333333", owner_id: "owner", project_id: "project", document_id: "doc", physical_page: 2, exact_sha256: "b".repeat(64), extraction_text: "calendar travel conflict", extraction_status: "text_layer", review_status: "hold" };
const document = { id: "doc", owner_id: "owner", project_id: "project", document_key: "synthetic-calendar", source_uri: "https://example.org/calendar.pdf", original_bytes_sha256: "a".repeat(64) };
const candidate: DocumentHopSearch["candidate"] = {
 candidateId: "hop", objective: "resolve", seed: { anomalyRef: "conflict", triggerEvidenceRefs: ["page:original"], requestedQuery: "calendar travel conflict" }, maxDepth: 2, maxHopsPerAttempt: 3,
 persistenceTarget: "arbor_pattern_hop_runs", executionRequested: false, status: "prepared_not_submitted",
 provenance: { packetId: "packet", documentId: "original", physicalPage: 1, originalBytesSha256: "c".repeat(64), pageHash: "d".repeat(64), sourceRefs: ["page:original"] },
 reason: "conflict", stoppingCondition: "original page review", reviewRequirements: { unresolvedIdentities: 1, contradictions: 1, privacyFlags: 0, originalPageReviewRequired: true },
 executionRoute: "document_research_adapter_required", canSubmitToHistoricalMemoryTool: false, independentCorroborationVerified: false,
};
function db(pages: unknown[] = [page], docs: unknown[] = [document], error: unknown = null) {
 const queries: any[] = [];
 const from = vi.fn((table: string) => {
  const q: any = {}; for (const k of ["select", "eq", "in", "or", "order", "gt"]) q[k] = vi.fn(() => q);
  q.limit = vi.fn(async () => ({data: pages, error}));
  q.then = (resolve: any) => Promise.resolve({data: table === "arbor_research_documents" ? docs : pages, error}).then(resolve);
  queries.push(q); return q;
 });
 return { client: {from} as never, queries, from };
}
describe("owned stored-page search for prepared document hops", () => {
 it("uses real ranking and returns page/hash anchors without certifying a finding", async () => {
  const m = db(); const result = await new SupabaseInvestigationStore(m.client, "owner", "project").searchPreparedPatternHopPages({candidate});
  expect(result.hits[0]).toMatchObject({recordId: page.id, pageHash: "b".repeat(64), source: {pdfPage: 2, sha256: "a".repeat(64)}, findingVerified: false});
  expect(result.triggerEvidenceRefs).toEqual(["page:original"]); expect(result.stoppingCondition).toBe("original page review");
  expect(result.corpusExhaustionVerified).toBe(false);
  for (const q of m.queries) { expect(q.eq).toHaveBeenCalledWith("owner_id", "owner"); expect(q.eq).toHaveBeenCalledWith("project_id", "project"); }
 });
 it("rejects returned foreign page or document rows", async () => {
  for (const m of [db([{...page,owner_id:"foreign"}]),db([page],[{...document,project_id:"foreign"}])])
   await expect(new SupabaseInvestigationStore(m.client,"owner","project").searchPreparedPatternHopPages({candidate})).rejects.toThrow("scope_mismatch");
 });
 it("keeps missing originals unresolved instead of claiming no evidence", async () => {
  const m=db([page],[]); const r=await new SupabaseInvestigationStore(m.client,"owner","project").searchPreparedPatternHopPages({candidate});
  expect(r.hits).toEqual([]); expect(r.unresolvedDocumentPageIds).toEqual([page.id]); expect(r.corpusExhaustionVerified).toBe(false);
 });
 it("returns a stable bounded batch cursor and applies it on continuation", async () => {
  const second={...page,id:"44444444-4444-4444-8444-444444444444"}; const m=db([page,second]); const store=new SupabaseInvestigationStore(m.client,"owner","project");
  const first=await store.searchPreparedPatternHopPages({candidate,limit:1}); expect(first.nextPageId).toBe(page.id);
  await store.searchPreparedPatternHopPages({candidate,limit:1,afterPageId:first.nextPageId!}); expect(m.queries[2].gt).toHaveBeenCalledWith("id",page.id);
 });
 it("propagates unavailable storage without a fallback to a different corpus", async () => {
  const m=db([],[],new Error("missing research schema")); await expect(new SupabaseInvestigationStore(m.client,"owner","project").searchPreparedPatternHopPages({candidate})).rejects.toThrow("missing research schema"); expect(m.from).toHaveBeenCalledTimes(1);
 });
});
