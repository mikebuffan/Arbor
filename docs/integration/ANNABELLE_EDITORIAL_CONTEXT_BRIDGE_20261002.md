# Annabelle editorial evidence → generation

This bounded read-only bridge closes a source wiring gap: the #222 editorial engine stores voice evidence, exemplars, canon, decisions and locks, while the active generation path previously loaded only the legacy workspace. It extends the current #223/#232/#233 candidate without replacing those systems.

## Active path

`app/api/chat/route.ts` → `prompt/buildPromptContext.ts` → `subsystem/context.ts` → `annabelle/editorialContext.ts` → `ANNABELLE EDITORIAL EVIDENCE` quoted-data block → backend agent instructions.

Ordinary Arbor generation never queries or attaches editorial evidence. Annabelle keeps canonical Arbor identity, shared corrections and the legacy workspace. Editorial data does not create a second identity or grant tool authority.

## Selection and interpretation

- Query existing #222 tables with explicit authenticated owner and project filters, plus manuscript scope on dependent rows. Check returned row scope as defense in depth; authorization errors propagate.
- Require exactly one canonical manuscript. Missing/ambiguous selection is reported in the context instead of choosing an arbitrary reference draft.
- An unambiguous explicit chapter mention in the current request selects chapter state. Both numbers and Chapter One–Ten are recognized. Without one, only manuscript-wide records are selected; existing workspace scene state remains available. No inferred active chapter is persisted.
- Keep full record type, confidence, epistemic status and source locator/hash. Hypotheses and contradictions remain unresolved. Rejected and superseded records do not enter generation.
- Source-derived voice evidence and gold exemplars need a current matching manuscript/chapter hash and nonempty locator. Confirmed voice evidence additionally requires an integer evidenceCount of at least two. These are consistency checks on stored evidence; they do not prove independent source reading or observation quality.
- Retain notes, decisions, canon, locks and character/relationship/physicality state according to trusted field semantics. Embedded instructions inside manuscript examples remain quoted reference data.
- Missing editorial tables yield an explicit unavailable status and preserve legacy workspace behavior. Other database errors are not silently hidden.

## Bounds and unresolved live gates

- The bridge reads a full bounded record window for the selected manuscript before chapter filtering, so it can exclude records superseded across global/chapter scope. More than 200 records yields an incomplete status with no partial evidence. A future reviewed, scoped successor query or durable current-record projection is needed for larger manuscripts; do not drop supersession checks merely to return more text.
- Selected records exceeding 30,000 serialized characters similarly yield incomplete status. Locked passages and exemplars are never silently clipped.
- This is a read-only consumer of #222's schema; no new tables, migrations, editorial writes, read receipts or worker activation are added. That schema must exist on the integrated deployment; this branch does not claim #222 is fully reconciled.
- Current conversation notes preserved in handoff documents are not claimed to have been saved into live editorial records. The authorized editorial writer still needs to save/reconcile those notes once the deployed state discrepancy is resolved.
- Actual source examples, accepted decisions and locks must be present and correctly scoped in storage. Wiring alone does not calibrate the whole novel.
- Live authenticated queries, source-hash verification against actual files and real generated-prose adherence remain open. No live ARK consumption or deployment is claimed.

## Verification

13 new checks cover owner/project/manuscript isolation, canonical ambiguity, global/chapter selection, unavailable chapters, supersession/rejection, source binding, repeated voice evidence, epistemic preservation, missing tables versus permission failures, count/size bounds, explicit chapter selection, actual stored-note inclusion in active generation injection, and ordinary Arbor exclusion.

Full backend suite: 588/588 passed. Production backend build passed with CI placeholder environment and system TLS certificates. These are source/test database contract checks, not live deployment acceptance. Supabase filter documentation and current changelog were checked; no auth/RLS/schema/API version changes are introduced.
