# Epstein public-records research engine — master ordered build list

Updated 2026-09-21. **One ARK lineage. No second engine.** This is a source-first public-document research system, not a claim of uninterrupted ChatGPT activity, autonomous findings, or guilt by association. Use only lawfully available public materials; do not publish victim or private-person identifiers.

**Source branches:** #123 is the bounded session/evidence-policy foundation. #131 adds the exact quote → observation bridge and fixes Vitest research test discovery. #134 (this child branch) adds the actual sandbox-only Poppler parser and a valid synthetic PDF fixture. Do **not** independently merge overlapping stacked PRs or overwrite the deployed investigation worker v5. Grove integration is a separate lane.

Legend: [x] draft code or CI-verified work exists, [~] partially done, [ ] still required. "Code exists" does not mean deployed, authorized or phone-tested.

## 1. Preserve what exists before any change

- [x] Inventory original worker v5 and synchronize its source on isolated #123, without deploying the branch.
- [x] Retain source/branch lineage for Grove and ARK; research changes do not touch Grove.
- [x] Preserve original evidence bytes and separate PDF page from printed folio.
- [x] Preserve parent PRs and review the latest heads before every integration.
- [ ] Capture a reviewed worker-v5 deployment backup and rollback receipt before any live worker change.
- [ ] Confirm currently deployed Vercel roots/cron and Firefly auth boundaries immediately before integration.
- [ ] Pin and review local parser runtime image/package version for reproducibility.
- [ ] Do not ship temporary CI pull-request base triggers into main.

## 2. Capture and parse actual public PDFs

- [x] Source identity, HTTPS URI, %PDF- signature, actual original-byte SHA-256 and 25 MiB maximum.
- [x] Reject HTML/consent-page impostors and credential-bearing or non-HTTPS source locators.
- [x] Existing pure per-physical-page evidence inventory with missing/duplicate-page rejection.
- [x] Actual Poppler `pdfinfo`/ `pdftotext` / `pdfimages` local parser, with no shell, URL fetch, or app routes.
- [x] Exact page-count inventory with a 128-page *local-fixture* cap, subprocess timeouts and bounded output.
- [x] Per-page text layer, raster-with-no-text, blank/unclassified and extraction-failure states.
- [x] Temporary local PDF bytes mode 0600, random temporary directory and cleanup.
- [x] A standards-conformant generated 4-page benign fixture: text / raster / text / blank; Poppler actually parses it in backend CI.
- [x] Test that every physical page retains its original document SHA-256 and stays on independent-review HOLD.
- [ ] Run a second fixture from an independently published benign original PDF and visually verify page images and line order.
- [ ] Add page-image rendering provenance and correct source-stamp/EFTA-number capture; never infer stamps from a file name.
- [ ] Handle files above local caps by an explicit split/batch design that preserves ORIGINAL full-file SHA and original physical-page numbering.
- [ ] Design a sandboxed PDF-processing runtime with untrusted-file isolation, memory limits, restricted filesystem and no egress by default.
- [ ] Provide an opt-in OCR processor for scanned pages, with confidence, source image and human verification, without inventing text.
- [ ] Add per-page PDF glyph/box geometry if exact visual highlighting is required; UTF-16 extracted-text offsets are NOT PDF byte or image coordinates.
- [ ] Do not treat a blank, encrypted, inaccessible, image-only or parser-failed page as absence of a fact.

## 3. Exact observations and evidence integrity

- [x] Existing pure, source-first comparison drafts with independent verification/privacy HOLD.
- [x] Exact selected passage carries page, document ID, original hash and UTF-16 text span.
- [x] Detect substitution of source record, excerpt, document identity or file hash.
- [x] End-to-end fixture test: actual PDF bytes → Poppler → validated page → exact quote → comparison draft.
- [ ] Persist source-byte capture, extraction run, text spans and claim lineage as atomic, immutable evidence records.
- [ ] Implement canonical source/version identity and duplicate PDF detection across renamed URLs.
- [ ] Distinguish source quote, independently verified observation, interpretation, hypothesis and published finding.
- [ ] Require independent original-page visual review and context verification before upgrading a review candidate.
- [ ] Enforce victim/private-person PII filtering and a separate publication review, not just a status string.
- [ ] Keep rejected hypotheses, missing data and extraction failures with reasons and timestamps.
- [ ] Verify two independently sourced claims rather than counting multiple copies of one underlying report as corroboration.

## 4. Bounded research sessions and DB safety

- [x] Pure 60-minute, one-unit-per-tick policy with work/cost/time limits, cancellation and lease checks in draft #123.
- [x] Proposed owner/project-scoped SQL and service-role-only adapter isolated outside auto-run migrations.
- [x] Before-start/deadline/authorization guards and distinct non-completion status for exhausted sessions.
- [x] Research test discovery corrected: Vitest runs `lib/research/*.test.ts`; tests are no longer falsely invisible behind green CI.
- [ ] Create/identify a truly disposable database with no real user data and an acknowledged cost profile.
- [ ] Apply proposed SQL only there; verify RLS with owner, other owner, anonymous, authenticated and service-role identities.
- [ ] Check search_path/SECURITY DEFINER, public/default EXECUTE permissions and privilege escalation.
- [ ] Stress concurrency: two claimers, worker crash, leases, cancellation, restart, deadline and duplicate settlement.
- [ ] Resolve late-settlement semantics without erasing previously committed evidence or checkpoint receipts.
- [ ] Verify cost reservations, attempt cap, failure receipts and release of stalled work.
- [ ] Implement evidence-backed completion verification separately from a zero-length queue or timer expiration.

## 5. Worker wiring and actual unattended acceptance

- [ ] Preserve live worker v5, review a proposed processor diff and establish a rollback route.
- [ ] Build a bounded capture/parse executor in a sandbox that explicitly supports authorized PDF work units.
- [ ] Connect actual evidence writes to session receipts and one-step Pattern Hop suggestions.
- [ ] Deduplicate leads and preserve sources, reasons, counterevidence and follow-up checkpoints.
- [ ] Add an owner/project-scoped default-OFF scheduler with distinct service authentication.
- [ ] Run a deterministic simulated 60-minute session, including restart and cancellation.
- [ ] Run a genuine unattended hour on permissible benign public sources; verify clock, receipts, budget and source correctness.
- [ ] Prove same user's project isolation and cross-session handoff before attaching Grove or voice.
- [ ] Verify real phone/operator status without inferring liveness from a read-only status card.
- [ ] Obtain separate explicit approval for production deployment, scheduler enablement and expenditure.

## 6. Actual Epstein public-document analysis and responsible reporting

- [x] Starter MCC/OIG comparison ledger distinguishing already published official findings from new research questions.
- [ ] Verify physical PDF pages and imagery of specific public EFTA records against the original OIG report.
- [ ] Reconcile cited testimony, contemporaneous logs, timestamps and what each source can actually establish.
- [ ] Redact victim and private-person information before any user-visible report or sharing.
- [ ] Classify leads as established public finding / corroborated observation / apparent conflict / missing context / insufficient evidence / extraction error / unresolved.
- [ ] Never treat a name, address-book appearance, flight-log mention or allegation alone as evidence of a crime.
- [ ] Produce a dated, source-checkable report with opposing evidence, limitations and explicit unfulfilled questions.
- [ ] Publish nothing automatically and preserve the distinction between an official published discrepancy and a novel research discovery.

## Milestone and truthful status

**Completed on draft code:** Original-byte capture, physical-page evidence contract, exact quote bridge, **actual local Poppler parsing of a valid synthetic multi-page PDF** and PDF→page→quote→review-draft tests. The backend CI includes the research suite.

**Not completed:** genuine third-party original public PDF acceptance, live worker processor, OCR, sandbox DB, Pattern Hop integration and authorized unattended research. The main build has not been deployed; no real Epstein document was processed by this new parser.

**Next dependency:** independently published harmless PDF with manual page-image verification → hardened sandboxed parser executor → disposable DB/security tests → worker-v5 compatibility → owner-authorized scheduler → actual evidence-backed research. Low-risk drafts may proceed; do not treat this list as permission for production writes, paid research, or unreviewed publication.
