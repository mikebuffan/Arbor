# Annabelle Source-Backed Reading Contract

## Non-negotiable invariant
Editorial notes, summaries, model claims, Voiceprint evidence, Gold candidates, and checkpoint writes are not evidence that prose was read.

A chapter counts as read for a pass only when a valid `annabelle_read_receipts` row exists whose:
- chapter and manuscript are owned by the same user/project;
- `source_sha256` equals the chapter's current source hash;
- `source_text_sha256` hashes the exact text presented to the reader;
- consumed range starts at 0 and ends at the source character count;
- consumed character count equals source character count;
- receipt has not been invalidated.

## Loop
1. Reconcile pass; obtain first missing receipt.
2. Load the complete source text for exactly that chapter/version.
3. Present/consume the complete text. Never substitute metadata, prior notes, summaries, embeddings, search snippets, or remembered plot.
4. Produce editorial evidence only after the full source has been consumed.
5. Issue the receipt using the exact source text and current chapter source SHA.
6. Database reconciles the checkpoint from receipts.
7. Continue with the returned next chapter.
8. If execution stops, restart at step 1. No user-supplied “continue” is logically required; the first missing receipt is the resume cursor.

## Version changes
Changing a chapter source SHA invalidates prior receipts for that chapter. Historical notes remain, but they cannot prove the new version was read.

## Failure behavior
- Empty text: no receipt.
- Partial text/range: no receipt.
- Source hash mismatch: no receipt.
- Notes without receipt: checkpoint does not advance.
- Manually asserted readComplete: irrelevant to read state.
- Interrupted execution: next run resumes from first missing valid receipt.

## Existing Ever After state
The 2026-10-01 reconciliation intentionally reset the continuous pass to Chapter 0 because historical notes were created before receipt enforcement. Those notes remain editorial observations but do not count as proof of reading. The manuscript must be re-read through the receipt loop before Arbor may state that the source-backed 1–60 pass is complete.
