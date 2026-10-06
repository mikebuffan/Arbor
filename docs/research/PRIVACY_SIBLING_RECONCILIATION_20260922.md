# Research privacy sibling reconciliation — synthetic-only integration design

Status: design only; no merge, release, real data or publication. Reviewed #175 (explicit-span redaction), #177 (metadata-only privacy ledger), and existing publicationPreflight on 2026-09-22.

## Non-overlapping responsibilities

1. `privacyRedactionReview.ts` (#175) accepts visible text and human-supplied UTF-16 spans, returns redacted text and a permanent independent privacy/release HOLD. It does not detect sensitive text or identify victims/private persons.
2. `privacyReviewLedger.ts` (#177) accepts metadata, reviewed-page inventory, flag decisions and optional redaction artifact references. It does not accept excerpts or verify that an artifact is correctly redacted. Withhold/missing artifact flags remain unresolved. Its empty unresolved list does NOT imply publication clearance.
3. `publicationPreflight.ts` (existing ancestor) checks presence of declared source/page/review receipts and unresolved flags, then retains explicit-release HOLD. `readyForHumanReleaseDecision` is NOT `mayPublish`.

## Integration contract before a code merge

- Stack the two sibling changes deliberately onto a new child of the newest verified head, preserving both modules and both test suites; do not merge one sibling branch over the other or replace the canonical master checklist with an older copy.
- The ledger's `redactionArtifactRef` must point to an immutable, owner/project-scoped reviewed artifact. A string alone is not proof; enforce content hash, source record, original page, span inventory and independent human review at the future durable boundary.
- Do not pass raw private/victim text to the metadata-only ledger. Keep source bytes and rendered page private until reviewed; public-facing output uses approved redacted artifact only.
- Build a typed adapter only after durable identity and authorization semantics are settled. A `reviewReceiptRef` assembled from caller strings is not a cryptographic receipt or an access grant.
- Propagate `withhold` and missing-artifact flags into preflight unresolved flags; preserve any independent privacy concerns even if all declared flags are cleared.
- Publication requires a separate explicit human release authorization; no module here can grant it. A mention, allegation, or association is not proof of misconduct.

## Synthetic acceptance cases for the future adapter

- Redacted artifact missing, wrong source/page/hash or reviewer: HOLD.
- Withheld flag: HOLD even when a redaction artifact exists elsewhere.
- No supplied spans or no flags: HOLD pending independent privacy/release review.
- All declared receipts present: still HOLD until separate release authorization.
- Owner/project mismatch and duplicate or stale review receipts: reject.
- Unreviewed original page or source-version substitution: reject.
- Repeated reporting or byte-identical mirror: never independent corroboration.

## Remaining gates

#175 and #177 exact-head CI succeeded independently; their combination has NOT been built or tested. #180 late-settlement head CI has not run. Item 18 independently published benign PDF/manual acceptance, item 43 isolated DB race tests, live worker, scheduler, real-source ingestion and publication remain separately gated. No production change was made by this design document.
