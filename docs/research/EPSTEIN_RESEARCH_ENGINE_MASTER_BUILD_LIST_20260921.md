# Epstein public-records research engine — master ordered build list

Updated 2026-09-21. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Research stack:** #123 bounded sessions/evidence policy → #131 exact quote bridge/test discovery → #134 local Poppler synthetic-fixture parser → #135 untrusted-PDF threat model → #136 content-first source/version identity → #139 evidence-stage promotion contract → #141 research outcome receipts → #142 bounded PDF batch planning → #144 held page-image/stamp provenance contract → #152 disposable renderer sandbox implementation. Grove and public-app PRs are separate lanes. Do not independently merge overlapping stacked PRs or overwrite deployed investigation worker v5.

Legend: [x] draft code plus relevant exact-head CI evidence exists; [~] partial or CI pending; [ ] required; **BLOCKED** means the named gate is intentionally not authorized in this build lane.

## 1. Preserve existing systems before integration

1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove/app branch lineage; no research changes to those lanes.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; #141 from #139 `9699ce8fee510979ffc9909220752f49a968a083`; #142 from #141 `a8909b880d4d4ab107244f165a20a51d593b7024`; #144 from #142 `d623dbc7281f518b74f0330e63228fdf92b7999d`; #152 from current #144 head `fec26c3e6006a895e04042b47ed97167e220c227` after confirming no newer research-engine PR.
5. [ ] **BLOCKED — live integration approval:** capture reviewed worker-v5 deployment backup + rollback receipt before live changes.
6. [ ] **BLOCKED — live integration approval:** confirm deployed Vercel roots/cron and Firefly auth immediately before integration.
7. [x] #152 pins Debian amd64 base by digest and exact Poppler package version; implementation head `cb1cfe133e00e46dc497a4c9f75933b2baa37dd8` passed Arbor Integration CI run `35680347043`, including the image build.
8. [ ] Remove all temporary stacked CI PR-base triggers before any main integration.

## 2. Capture and parse public PDFs safely

9. [x] HTTPS source identity, `%PDF-` signature, exact original-byte SHA-256 and 25 MiB capture maximum.
10. [x] Reject HTML/consent impostors, credentials and non-HTTPS source locators.
11. [x] Complete physical-page inventory; reject missing/duplicate pages.
12. [x] Local Poppler `pdfinfo`/`pdftotext`/`pdfimages` parser: argument arrays, no shell, no URL fetch/app route.
13. [x] 128-page local-fixture cap, subprocess timeout and bounded output.
14. [x] Text-layer/raster-without-text/blank-unclassified/extraction-failure states.
15. [x] Mode-0600 temporary PDF, random temp directory and cleanup.
16. [x] Valid generated four-page benign PDF is parsed by real Poppler in CI.
17. [x] Every page keeps original SHA and independent-review HOLD.
18. [ ] Independently published benign PDF acceptance + manual rendered-page/line-order/page-count/hash verification. Sandbox prerequisite is now satisfied by item 21, but no third-party PDF has been executed or manually accepted yet.
19. [x] #144 adds pure page-image byte-hash/original-page/renderer metadata receipt and explicit manually attested source-stamp candidate, always HOLD. Exact-head Arbor Integration CI run 35672651469 passed on `e0805c884a57c79b1d158cafacced7ffd1eb4a97`. It does NOT render a PDF, decode PNG pixels, authenticate the renderer/reviewer, or replace independent visual/privacy review.
20. [x] #142 adds pure bounded page-batch planning above the 128-page local ceiling while preserving one full-file SHA, original document page count and original physical-page numbering; exact-head CI on `d623dbc7281f518b74f0330e63228fdf92b7999d` passed. Executable byte splitting remains separately gated.
21. [x] #152 implements the executable disposable renderer boundary specified by #135: digest-pinned amd64 Debian base, exact Poppler package, numeric non-root user, immutable `sha256:` image-ID requirement, no network, read-only root, all capabilities dropped, no-new-privileges, bounded RAM/swap/PIDs/CPU/file descriptors/tmpfs/time/output, explicit read-only input and output-only bind. Corrected implementation head `cb1cfe133e00e46dc497a4c9f75933b2baa37dd8` passed Arbor Integration CI run `35680347043`, including a real Poppler render of a generated harmless synthetic PDF under the isolation boundary. This verifies synthetic sandbox execution only; it is not third-party-file acceptance.
22. [ ] Opt-in OCR processor with source-image reference, confidence and mandatory human verification. Untrusted-input use remains downstream of item 18 acceptance and separate source authorization.
23. [ ] Per-page glyph/box geometry only if exact visual highlighting becomes required; extracted UTF-16 offsets are not PDF/image coordinates.
24. [x] Current contracts keep blank/image-only/encrypted/inaccessible/parser-failed states from supporting absence claims; integration must preserve this.

## 3. Exact observations and evidence integrity

25. [x] Source-first comparison drafts remain independent-verification/privacy HOLD.
26. [x] Exact selected passage carries page, document ID, original hash and UTF-16 span.
27. [x] Detect source/excerpt/document/hash substitution.
28. [x] Synthetic end-to-end bytes → Poppler → page → exact quote → comparison-draft test.
29. [ ] **BLOCKED — disposable DB first:** persist source capture, extraction run, spans and claim lineage as atomic immutable evidence records.
30. [~] #136 separates content identity from URL/local ID, detects byte-identical mirrors and same-URL changed bytes. Durable owner/project canonical index, final-redirect capture and cross-project persistence tests remain.
31. [x] #139 adds typed `source_quote → verified_observation → interpretation → hypothesis → published_finding` one-step promotion; exact-head CI run 35663024929 passed. Persistence/integration remain separately gated.
32. [~] #139 requires original-page + context review before quote becomes verified observation. Real visual-review workflow remains.
33. [~] #139 requires privacy + publication review before `published_finding`; actual PII filter/publication-review implementation remains.
34. [x] #141 adds pure immutable audit contracts for rejected hypotheses, missing data and extraction failures with timestamps/reasons/provenance and no overwrite semantics. Exact-head CI on `a8909b880d4d4ab107244f165a20a51d593b7024` passed. Durable persistence remains blocked on item 40.
35. [~] #136 prevents byte-identical mirrored URLs from being counted as independent corroboration; source-chain independence proof still required.

## 4. Bounded sessions and database safety

36. [x] Pure 60-minute one-unit-per-tick policy with work/cost/time/cancel/lease guards in #123.
37. [x] Proposed owner/project-scoped SQL + service-role adapter remain outside auto-run migrations.
38. [x] Before-start/deadline/authorization guards and distinct non-completion state.
39. [x] #131 fixes Vitest discovery so `lib/research/*.test.ts` executes.
40. [ ] **BLOCKED — explicit disposable DB/cost approval:** create/identify DB containing no real user data.
41. [ ] **BLOCKED — item 40:** apply proposed SQL only there; test owner/other-owner/anonymous/authenticated/service-role RLS.
42. [ ] **BLOCKED — item 40:** inspect search_path, SECURITY DEFINER, default/public EXECUTE and privilege escalation.
43. [ ] **BLOCKED — item 40:** concurrency: two claimers, crash, leases, cancel, restart, deadline, duplicate settlement.
44. [ ] Resolve late-settlement semantics without erasing committed evidence/checkpoints; validate in item 43.
45. [ ] Verify cost reservation, attempt cap, failure receipts and stalled-work release in disposable environment.
46. [ ] Implement evidence-backed completion verification separately from empty queue/timer expiry.

## 5. Worker wiring and unattended acceptance

47. [ ] **BLOCKED — live integration approval:** preserve live worker v5, review proposed processor diff and rollback route.
48. [ ] **BLOCKED — item 18 external-file acceptance/source authorization:** bounded authorized capture/parse executor for third-party inputs.
49. [ ] **BLOCKED — DB items 40–45:** connect immutable evidence writes to receipts + one-step Pattern Hop suggestions.
50. [ ] Lead dedupe preserving sources, reasons, counterevidence and checkpoints.
51. [ ] **BLOCKED — separate scheduler authorization:** owner/project-scoped default-OFF scheduler with distinct service auth.
52. [ ] Deterministic simulated 60-minute session including restart/cancel after safe executor + disposable DB exist.
53. [ ] **BLOCKED — explicit benign unattended-run approval:** genuine unattended hour only on permissible benign public sources; verify receipts/budget/source correctness.
54. [ ] Prove same-user project isolation and cross-session handoff before Grove/voice attachment.
55. [ ] Real phone/operator acceptance; never infer worker liveness from read-only status UI.
56. [ ] Separate explicit approval for production deployment, scheduler enablement and any expenditure.

## 6. Epstein public-document analysis and responsible reporting

57. [x] Starter MCC/OIG ledger distinguishes published official findings from open research questions.
58. [ ] **BLOCKED — item 18 acceptance + separate source authorization:** verify physical pages/images of specific public EFTA records against original OIG report.
59. [ ] Reconcile testimony/logs/timestamps only after original-source capture; state what each source can establish.
60. [ ] Redact victim/private-person information before any user-visible report/share.
61. [ ] Classify: established public finding / corroborated observation / apparent conflict / missing context / insufficient evidence / extraction error / unresolved.
62. [x] Policy invariant: name/address-book/flight-log mention/allegation alone is never evidence of a crime.
63. [ ] Dated source-checkable report with counterevidence, limitations and explicit unresolved questions.
64. [x] No automatic publication; official published discrepancies remain distinct from novel research discoveries.

## Current handoff

**Verified research lineage:** #139 exact head `9699ce8fee510979ffc9909220752f49a968a083` passed Arbor Integration CI run 35663024929; #141 exact head `a8909b880d4d4ab107244f165a20a51d593b7024` passed configured CI; #142 exact head `d623dbc7281f518b74f0330e63228fdf92b7999d` passed configured CI; #144 implementation head `e0805c884a57c79b1d158cafacced7ffd1eb4a97` passed Arbor Integration CI run 35672651469. Current #144 docs head is `fec26c3e6006a895e04042b47ed97167e220c227`. #152 corrected implementation head `cb1cfe133e00e46dc497a4c9f75933b2baa37dd8` passed Arbor Integration CI run `35680347043`; branch handoff/docs head before this refresh was `d049301558a2129cbb5d38f88fa7a407b0822dc5`.

**Completed/status-corrected this run:** re-opened the master list on the actual #152 branch, verified #152 is still draft/unmerged, and reconciled stale items 7/21 from CI-pending to verified synthetic-sandbox scope. Item 18 is now the next external-file fidelity gate; it is not marked complete because no independently published third-party PDF has been executed or manually reviewed.

**Next numbered item:** 18 — independently published benign PDF acceptance/manual fidelity verification. It requires a permissible external benign PDF to be supplied to an environment that can run the verified disposable Docker sandbox while preserving original bytes/hash, followed by manual rendered-page/line-order/page-count/hash review. Do not substitute another synthetic fixture.

**Independent safe work while item 18 is unavailable:** item 46 (evidence-backed completion verification), then item 50 (lead dedupe preserving provenance/counterevidence/checkpoints), provided source inspection confirms they are not duplicate implementations and they remain pure-code/draft-only.

**Real blockers:** items 40–45 require explicit disposable-DB/cost approval; 47/51/56 require separate live/scheduler/deployment authorization; 48/58 require item 18/source authorization; 53 requires explicit benign unattended-run approval. No merge/deploy, production DB, live worker, scheduler, paid API, private/victim data, Epstein/EFTA document processing or publication was performed in this run.
