# ARK investigation research — dependency-ordered work plan
Date: 2026-09-21. Scope: isolated draft PR #123. **No automatic deployment, paid services, production DDL, worker invocation or investigation enqueue.**

Legend: [x] implemented/verified; [~] partial/design only; [ ] incomplete; [!] separate release gate. Scope: public-source document research, evidence provenance, privacy.

## A. Preserve and verify a working baseline

- [x] A01 Inspect draft PR, branch head, CI history; do not mistake old green CI for current head.
- [x] A02 Read live arbor-investigation-worker **v5** with read-only Supabase tools.
- [x] A03 Copy deployed v5 index.ts and deno.json unchanged onto isolated branch, then verify exact content match.
- [ ] A04 Obtain a truly disposable, Supabase-compatible DB with matching auth/projects roles. The active Firefly production and Firefly ARK Preview projects are NOT disposable. New paid projects/branches need separate cost approval.
- [ ] A05 Run proposal SQL only in that sandbox; test anonymous/other-owner reads, service-role RPC, concurrency, lease expiry, duplicate receipts, cancellation, late receipt and clock boundary.
- [!] A06 Do not promote SQL into auto-run migrations until DB tests and separate release approval.

## B. Build a bounded hour of genuine research

- [x] B01 UTC start/deadline <=60m, cancellation, pause, owner/project, max-work/max-cost policy.
- [x] B02 One leased work unit per tick; restart/duplicate receipt simulation and cost reservations.
- [x] B03 Refuse pre-start work in pure policy and proposed database claim RPC.
- [x] B04 Reject post-deadline settlement and revoked authorization results.
- [x] B05 Empty queue means awaiting verification, NOT research completion.
- [~] B06 Enforce deadline/abort at network and parser boundaries, not only at settlement.
- [ ] B07 Connect to the deployed v5 investigation worker behind independent default-off authorization, without expanding the global production canary.
- [ ] B08 Resolve root/backend Vercel cron differences against actual deployment root.
- [ ] B09 Simulate real unattended hour of scheduled worker ticks and recovery.
- [!] B10 Check costs and get separate approval before enabling real unattended research.

## C. Build trustworthy public-document evidence processing

- [x] C01 Comparison draft requires source URL, document ID, physical PDF page, actual excerpt, optional authentic checksum and review/privacy HOLD.
- [x] C02 Comparison tests reject missing page, invalid URL, hash formatting, same-page self-comparison, auto-certified claims.
- [~] C03 Public-source URL host/redirect/SSRF policy with bounded time and size.
- [ ] C04 Binary PDF fetch: MIME/signature check, original-byte SHA-256, size and deadline, no mistaking login/age-gate HTML for PDF.
- [ ] C05 Real PDF parser that preserves 1-based physical pages separately from printed folios.
- [ ] C06 Scanned-page path/image check with explicit OCR/empty-page uncertainties.
- [ ] C07 Persist provenance-preserving chunks and idempotent reprocessing.
- [ ] C08 Extract atomic entities/events/claims with verbatim excerpts and uncertainty.
- [ ] C09 Compare independent documents, then Pattern Hop against actual investigation evidence rather than treating user memory as primary evidence.
- [ ] C10 Independent corroboration, entity/alias matching, contradiction review; association does not imply culpability.
- [ ] C11 Privacy review for survivors, witnesses and other private persons.
- [ ] C12 Export a reviewable internal packet with original links/pages and honest failed-search ledger.

## D. Specific public Epstein/MCC research

- [x] D01 OIG June 2023 starter ledger identifies published midnight-count explanation and conflicting recollections; neither claimed as new ARK discovery.
- [~] D02 Locate original EFTA timeline and related released jail records; no treating search snippets as validated source pages.
- [ ] D03 Inspect original EFTA PDF/page images through authorized access; store exact locator and redaction status.
- [ ] D04 Normalize time zones/event definitions and distinguish out-of-order timeline rows from real contradiction.
- [ ] D05 Compare report narrative to exhibits/interviews and classify supported, unresolved and refuted observations.
- [ ] D06 Assemble a private evidence packet only after provenance/privacy review; outside collaboration optional.

## E. End-to-end acceptance and release

- [x] E01 Keep branch/PR separate from Grove and production main.
- [~] E02 Run CI for current head and record exact green SHA.
- [ ] E03 Test malicious PDFs, empty scans, redirects, duplicate releases, failures and resumability in sandbox.
- [ ] E04 Review service-role scope, secrets and worker-source parity before deploy.
- [ ] E05 App status differentiates working, blocked, timebox ended, verified complete and source unavailable.
- [!] E06 Ask separately before release/production run. Keep rollback instructions.
- [ ] E07 Verify real execution logs, costs, sample evidence and 60m unattended continuation or honest remaining-work state.

## Immediate execution queue

1. Update README with verified live v5 source synchronization and explicit no-deploy guard.
2. Implement/test public-source URL policy and bounded PDF intake boundary without changing live worker.
3. Audit false-progress, deadline and cost edge cases in SQL and TypeScript.
4. Check current-head CI; do not claim DB testing until a disposable DB exists.
5. Record exact blockers and continue working on next safe isolated unit.
