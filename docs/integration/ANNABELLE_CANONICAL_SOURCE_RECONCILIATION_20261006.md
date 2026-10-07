# Annabelle canonical source and continuation reconciliation — 2026-10-06

Status: source-side reconciliation only. No deployment, live inference activation, manuscript rewrite, or database mutation.

## Durable canonical manuscript
Read-only Annabelle state identifies:
- manuscript: Ever After
- manuscript id: `3e6f799e-1702-4282-b134-95e59aed2bb6`
- source label: `Ever After Finished Novel(2).zip / ever-after-STANDARD.pdf`
- canonical source SHA-256: `b8a28f514260ea7a6a2551e2628f90a0405686745f2eb90df1c25df39f159d0d`
- chapter count: 60
- prose stored in editorial DB: false

Chapter Two durable descriptor:
- chapter id: `726ce2ee-9628-4b2d-9d72-f8ca9b846730`
- label: `Chapter I Hate`
- chapter source SHA-256: `1d068dd6fbd5ba6f4906c8a8f5ba92e47228b9f30289af7f15f50adf2b6ec628`
- durable source locator: printed/source pages 91-176
- durable extracted word count: 16,017

The retained Reedsy PDF in the user Library was independently inspected as a 2,996-page file. In the physical PDF, Chapter Two begins on PDF page 99 and Chapter Three begins on PDF page 185. Local extractor hashes are not promoted to canonical because extraction normalization differs from the durable ingestion pipeline.

## Continuous-read reconciliation
The continuous checkpoint row is stale: it still says nextChapter=2. However, provenance-bound chapter records mark readComplete=true through Chapter 60 and the record set is not truncated. Therefore:
- do not re-read 2-60 merely because the checkpoint row is stale;
- do not delete the stale checkpoint; it is evidence of an older receipt model;
- future continuation should reconcile receipts from the source-bound completed records before advancing a checkpoint.

## Editing continuation
Continuous reading and editing are separate passes. Current manuscript editing remains on Chapter Two final acceptance, not Chapter Three. The safe continuation target is the unresolved Chapter Two pass; moving to the next chapter remains a collaborative editorial gate rather than an automatic engine action.

## Gold evidence
The one durable whole-book `gold_exemplar` record is explicitly marked invalidated because it was generated before chapters 29-60 were actually read. It is not silently reactivated. Source-backed scene anchors are retained as candidates only; exact canonical prose + explicit validation is required before they become mature Gold calibration evidence.
