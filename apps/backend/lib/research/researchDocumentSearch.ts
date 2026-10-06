import type { SupabaseClient } from "@supabase/supabase-js";
import { hybridRetrieve } from "./hybridRetrieval";
import { validatePublicSourceLocator } from "./evidenceComparison";
import type { preparePatternHopFromReviewPacket } from "./researchPatternHopBridge";
export type DocumentHopSearch = { candidate: ReturnType<typeof preparePatternHopFromReviewPacket>; afterPageId?: string; limit?: number };
const req = (v: unknown): string => { if (typeof v !== "string" || !v.trim()) throw new Error("invalid_document_search_row"); return v; };

/** Internal read adapter. Scope comes from the trusted store constructor,
 * not the candidate. Searches only stored pages; no fetch/embedding/ingestion. */
export async function searchOwnedResearchPages(db: SupabaseClient, owner: string, project: string, input: DocumentHopSearch) {
  const c = input.candidate;
  if (c.status !== "prepared_not_submitted" || c.executionRequested !== false || c.canSubmitToHistoricalMemoryTool !== false)
    throw new Error("document_search_requires_prepared_candidate");
  const query = req(c.seed.requestedQuery);
  if (query.length > 4000) throw new Error("document_search_query_limit");
  const terms = [...new Set(query.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])].slice(0, 12);
  if (!terms.length) throw new Error("document_search_terms_required");
  const limit = input.limit ?? 40;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("document_search_limit");
  if (input.afterPageId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.afterPageId)) throw new Error("document_search_cursor");
  let q = db.from("arbor_research_pages")
    .select("id,owner_id,project_id,document_id,physical_page,exact_sha256,extraction_text,extraction_status,review_status")
    .eq("owner_id", owner).eq("project_id", project).in("extraction_status", ["text_layer", "ocr"])
    .or(terms.map(t => `extraction_text.ilike.%${t}%`).join(",")).order("id", { ascending: true });
  if (input.afterPageId) q = q.gt("id", input.afterPageId);
  const {data, error} = await q.limit(limit + 1);
  if (error) throw error;
  const pages = (data ?? []).slice(0, limit);
  const assertScope = (r: any) => { if (r.owner_id !== owner || r.project_id !== project) throw new Error("document_search_scope_mismatch"); };
  pages.forEach(assertScope);
  const ids = [...new Set(pages.map(p => req(p.document_id)))];
  const documents = new Map<string, any>();
  if (ids.length) {
    const r = await db.from("arbor_research_documents").select("id,owner_id,project_id,document_key,source_uri,original_bytes_sha256")
      .eq("owner_id", owner).eq("project_id", project).in("id", ids);
    if (r.error) throw r.error;
    for (const document of r.data ?? []) { assertScope(document); documents.set(req(document.id), document); }
  }
  const unresolvedDocumentPageIds: string[] = [];
  const anchored = pages.flatMap(p => {
    const pageId = req(p.id), doc = documents.get(req(p.document_id));
    if (!doc || typeof p.extraction_text !== "string" || !p.extraction_text.trim()) { unresolvedDocumentPageIds.push(pageId); return []; }
    const source = { documentId: req(doc.document_key), sourceUrl: req(doc.source_uri), pdfPage: Number(p.physical_page),
      excerpt: p.extraction_text.slice(0, 2000), sha256: req(doc.original_bytes_sha256) };
    validatePublicSourceLocator(source);
    const pageHash = req(p.exact_sha256);
    if (!/^[a-f0-9]{64}$/i.test(pageHash)) throw new Error("document_search_page_hash");
    return [{ pageId, source, pageHash, text: p.extraction_text.slice(0, 200000), textTruncated: p.extraction_text.length > 200000,
      extractionStatus: p.extraction_status, reviewStatus: p.review_status, sourceRefs: [`page:${pageId}`] }];
  });
  const hits = hybridRetrieve({ query: { text: query }, limit, documents: anchored.map(p => ({ recordId: p.pageId, text: p.text, identifiers: [], sourceRefs: p.sourceRefs })) });
  const byId = new Map(anchored.map(p => [p.pageId, p]));
  return { candidateId: c.candidateId, triggerEvidenceRefs: c.seed.triggerEvidenceRefs, stoppingCondition: c.stoppingCondition,
    hits: hits.map(hit => { const p = byId.get(hit.recordId)!; return { ...hit, source: p.source, pageHash: p.pageHash,
      textTruncated: p.textTruncated, extractionStatus: p.extractionStatus, reviewStatus: p.reviewStatus, findingVerified: false as const }; }),
    nextPageId: (data ?? []).length > limit && pages.length ? req(pages[pages.length - 1].id) : null,
    unresolvedDocumentPageIds, searchCoverage: "bounded_matching_page_batch" as const,
    corpusExhaustionVerified: false as const, originalPageReviewRequired: true as const,
  };
}
