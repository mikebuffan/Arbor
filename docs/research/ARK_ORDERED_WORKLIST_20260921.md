# ARK — dependency-ordered research worklist

Updated 2026-09-21. **Actual state, not promises.** Draft PR #123 remains isolated and unmerged; this checklist is not authorization to deploy or start costly research. Do not overwrite Mike's live worker or touch original Firefly data as a test fixture.

## A. Capture the known working baseline

- [x] Verify draft PR #123 head and previous CI. Latest checked head before this worklist: `ef8f56d305dc86dad22314c038d4287bb8b6636e`; GitHub Actions 35608343718 succeeded.
- [x] Read the live Firefly `arbor-investigation-worker` metadata and files through the Supabase read-only connector. Live version **5**, status ACTIVE, JWT verification enabled, with `index.ts` and `deno.json`; metadata bundle hash `f70e2a8a84cc6b61c06dff62666ad053f2afb0f4b72e6099bce724c054f17734`. No deploy performed.
- [x] **Initially** repository `index.ts` was a stale placeholder. Another isolated-branch commit synchronized actual deployed v5 source; verified the current branch's file is byte-for-byte identical to the live v5 `index.ts`. No function deployment was performed.
- [x] Confirm live v5 currently handles HTTPS text/HTML/JSON capture and `text_ingest` chunking, but returns a blocked checkpoint for binary/PDF inputs and unknown processor types.
- [x] Synchronize deployed v5 `index.ts` in the isolated draft branch and compare against the read-only deployed source (exact match on 2026-09-21). Still review/agree canonical source and keep a restore plan before *any* future deployment; do not treat source sync as processor deployment.

## B. Session policy and research correctness — isolated code

- [x] 60-minute bounded policy with work/cost caps, one unit/tick, lease fencing and idempotent settlement design; owner/project-pinned adapter.
- [x] Deadline checked at proposed DB settlement; pausing or revoking authorization invalidates active work.
- [x] Early-start guard in code and proposed DB claims; zero-unresolved-work guard in proposed DB.
- [x] Reject malformed stored session authorization/status/evidence refs.
- [x] Existing test verifies tick at exactly deadline stops. Added explicit before-start test proving idle with no claim or executor.
- [ ] Review DB late-settlement behavior against crash/retry receipt semantics: reject late *new* work, preserve existing receipts, and avoid inadvertently erasing a predeadline checkpoint.
- [x] Proposed SQL now caps each issued lease at the session deadline and checks start/deadline/status/authorization at settlement; **DB race and cancellation behavior still require sandbox tests**.
- [ ] Verify unit attempt cap, retry backlog, budget reservation and failure-report behavior under concurrent claims.
- [ ] Ensure all RPC permissions/default execute/public grants are correct in a real database, not only mocked Vitest.
- [ ] Make verified completion a distinct evidence-backed transition; a zero-length queue or 60-minute end must not silently claim the objective was answered.

## C. Database integration — disposable sandbox only

- [ ] Identify or create a **disposable** Postgres/Supabase-compatible database with acknowledged cost and no real user data. Do not assume ARK Preview or Firefly production is disposable.
- [x] Read-only Firefly schema inspection on 2026-09-21 confirms `public.projects.id` and `.user_id` are UUID, and the existing `projects_id_user_id_ark_owner_idx` is a unique composite index satisfying the proposed composite owner FK. **Actual proposed SQL application is still untested**.
- [ ] Apply `docs/research/sql/PROPOSED_arbor_research_sessions.sql` **only** to the disposable DB after adapting to real schema.
- [ ] Test RLS with authenticated user A, user B, anon and service role; cross-owner reads/claims must fail.
- [ ] Simulate competing claimers, worker crash, lease timeout/reclaim, duplicate settlement, paused/cancelled state, deadline, cost ceiling, invalid receipt and 0 unresolved work.
- [ ] Inspect actual DB race conditions and errors before promoting SQL to any migration.

## D. Processors: source → page → evidence → comparison

- [ ] Preserve backed-up working v5 before a processor change. Restore plan + provenance.
- [ ] Build a dedicated PDF extraction test fixture using **public/non-sensitive** source PDFs; record original PDF bytes hash, source URI, document ID and physical page.
- [x] Added pure **pre-parser intake boundary** `pdfPageProvenance.ts` and tests requiring the complete physical-page inventory, original-bytes checksum format, distinct printed folio, and explicit image-only/failed page states. This DOES NOT parse real PDF bytes or perform OCR; those processors and fixture tests remain open.
- [ ] Page intake now keeps physical PDF page and printed folio separately. Still need EFTA stamp, offsets and correctness test against a real original PDF.
- [ ] Add bounded fetch/download and text extraction handling for large public releases, unexpected types, redirects and retries. Do not bypass publisher age/consent or access controls.
- [ ] Create atomic observation/evidence extraction with precise original passage, source locator and epistemic type.
- [x] Pure comparison draft module and tests requiring source URL, physical PDF page, excerpt and context, with mandatory independent-verification and privacy HOLD.
- [ ] Connect comparison to actual capture data and enforce private-person/victim redaction prior to external sharing.
- [ ] Integrate Pattern Hop over the **research evidence store**, not merely existing user historical-memory retrieval; dedupe branches and persist source-backed follow-up rationale.
- [ ] Implement independent source verification, genuine disagreement checks, and reporting with limitations and a visible evidence chain.

## E. Scheduling and release

- [ ] Confirm actual Vercel deployment root and existing heartbeat before changing cron; repository has different ten-minute and daily configurations.
- [ ] Integrate a separate service-secret-protected, owner-authorized research tick **disabled by default**; it must not broaden current production ARK canary exposure.
- [ ] Run full 60-minute clock-driven simulation without chat prompts, including interruption/restart, stop/cancel, budgets, and source-report accuracy.
- [ ] Run isolated end-to-end tests on permitted public test sources, confirm cost and retention, and obtain phone/user acceptance.
- [ ] Review security/privacy and obtain distinct authorization before enabling the production scheduler or any real investigation queue. Never infer production consent from “keep working on the draft.”
- [ ] Publish an honest status: deployed version, active project, last job time, work units, verified sources, blocked items, expenditures, and next unresolved question.

## F. Initial Epstein source-comparison queue

- [x] Draft a cautious MCC starter ledger distinguishing known OIG findings from possible follow-up: `docs/research/INITIAL_MCC_EVIDENCE_LEDGER_20260920.md`.
- [ ] Verify original image/page of EFTA00034505 and EFTA00019759 through legitimate access and compare against the 2023 OIG report; record physical pages before any interpretation.
- [ ] Reconcile testimony and contemporaneous logs against the OIG's reported timeline without speculating about culpability or treating differing recollections as proof of a new fact.
- [ ] Preserve anonymization and redact private-person/victim information; publish nothing automatically.
- [ ] Triage every lead as verified public finding / corroborated difference / apparent conflict / insufficient evidence / extraction error / unresolved; retain rejected hypotheses and why they failed.

**Hard boundary:** no production DB mutations, Edge Function deploys, production feature flags, costly project/branch creation, or public release from this worklist. Authorize and verify those separately.
