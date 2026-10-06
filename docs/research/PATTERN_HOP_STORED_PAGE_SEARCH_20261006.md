# Pattern Hop stored-page search

Built on the document review/origin/alias patch in PR #239. The existing trusted `SupabaseInvestigationStore` now exposes `searchPreparedPatternHopPages`, backed by a bounded read adapter over the existing owned research pages and documents.

The adapter takes a prepared document-review candidate. Scope is fixed by the store constructor, not read from candidate/model data. Both page and original-document queries use owner/project predicates; returned foreign rows reject. It searches only already-ingested text-layer/OCR page text. It does not fetch external sources, ingest documents, call an embedding provider or enable execution/publication gates.

A page batch is filtered by bounded normalized literal terms, ordered by page UUID and continued with an opaque page UUID cursor. Page matching is ranked using the existing hybrid retrieval module without semantic-provider calls. Results carry original document URL/hash, physical page, page hash, extraction/review status and page source references. Candidate trigger references and stopping condition survive the call. Excerpts are previews of page text, not a claim that the matched phrase appears inside the displayed excerpt.

Missing original documents remain unresolved. Storage errors propagate without fallback to a different corpus. Text above the ranking size bound is explicitly marked truncated. Empty results and exhausted batches never certify corpus exhaustion or a verified finding. Source families, identity decisions, original-image review and independence still need their existing review flow.

## Checks

217 offline research tests pass; TypeScript and whitespace checks pass. New checks use the real ranker with a mocked scoped database to verify anchors, foreign-row denial, unresolved originals, pagination and unavailable storage.

The query uses existing schema columns and creates no schema change. Original ingestion remains separately gated. The installed live plugin has no document-search tool; a trusted host/worker caller and real owned corpus readback are still required to expose this method operationally. The research stack is separate from the historical-memory worker branch, so the new method is not represented as deployed there.
