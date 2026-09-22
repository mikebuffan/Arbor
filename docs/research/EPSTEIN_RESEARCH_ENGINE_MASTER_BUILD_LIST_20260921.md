# Epstein public-records research engine — master ordered build list

Updated 2026-09-22. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Research stack:** #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157 → #158 → #163. Grove/public-app work is separate.

Legend: [x] draft code plus relevant exact-head CI evidence exists; [~] partial/CI pending; [ ] required; **BLOCKED** names an intentionally gated dependency.

## 1. Preserve existing systems before integration
1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove/app branch lineage.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; current research top is draft #163 head `b164d2f4d3cc402939f32f19f0c82e2a6987c4a8` before this documentation-only handoff commit.
5. [ ] **BLOCKED — live integration approval:** worker-v5 deployment backup + rollback receipt.
6. [ ] **BLOCKED — live integration approval:** deployed Vercel roots/cron/Firefly auth review.
7. [x] #152 pinned disposable renderer image/package; verified CI run `35680347043`.
8. [ ] Remove temporary stacked CI PR-base triggers before any main integration.

## 2. Capture and parse public PDFs safely
9. [x] HTTPS source identity, `%PDF-`, original-byte SHA-256, 25 MiB capture maximum.
10. [x] Reject HTML/consent impostors, credentials and non-HTTPS locators.
11. [x] Complete physical-page inventory.
12. [x] Local Poppler parser uses argument arrays/no shell/no URL fetch.
13. [x] 128-page local-fixture cap, timeout and bounded output.
14. [x] Explicit text/raster/blank/failure states.
15. [x] Mode-0600 temporary PDF/random temp directory/cleanup.
16. [x] Real Poppler parses generated four-page benign synthetic PDF in CI.
17. [x] Every page keeps original SHA + independent-review HOLD.
18. [ ] **BLOCKED — external benign-file execution/manual review:** independently published benign PDF acceptance + rendered-page/line-order/page-count/hash verification. Sandbox prerequisite 21 is satisfied; acceptance itself is not.
19. [x] #144 page-image provenance/manual source-stamp HOLD contract; CI `35672651469`.
20. [x] #142 bounded page-batch planning preserving full-file provenance.
21. [x] #152 executable non-root/no-egress/read-only bounded renderer sandbox; synthetic render verified in CI `35680347043`.
22. [ ] Opt-in OCR with image provenance/confidence/human verification; downstream of 18.
23. [ ] Glyph/box geometry only if exact visual highlighting becomes required.
24. [x] Blank/image-only/encrypted/inaccessible/parser-failed cannot support absence claims.

## 3. Exact observations and evidence integrity
25. [x] Source-first comparison drafts stay verification/privacy HOLD.
26. [x] Exact selected passage carries page/document/hash/UTF-16 span.
27. [x] Source/excerpt/document/hash substitution detection.
28. [x] Synthetic bytes → Poppler → page → exact quote → comparison test.
29. [ ] **BLOCKED — disposable DB first:** immutable evidence persistence.
30. [~] #136 content identity vs URL/local ID; #170 adds pure in-memory content grouping and tenant-scoped aliases with five synthetic tests. Exact-head `574d3a5c027db233d00326bed31d47df090ccc5a` CI backend/control/Flutter/disposable PDF sandbox all passed. Durable index, final redirect capture, authorization-backed access and DB persistence remain.
31. [x] #139 typed one-step evidence promotion; CI `35663024929`.
32. [~] Original-page/context review contract exists; draft #172 adds pure synthetic reviewer receipt binding original SHA, physical page, image hash, quote span and explicit independent/context/visual attestation; five synthetic tests. Exact-head `10df39c834502ce6ad755a65162fcfc199be465f` CI backend/control/Flutter/disposable PDF sandbox all passed. Real human original-page workflow and privacy review remain.
33. [~] Privacy/publication gates exist; synthetic-only `publicationPreflight.ts` requires explicit review receipts and unresolved-flag clearance but always retains release-authorization HOLD. No automatic PII detection or real-data redaction claim; exact-head `62832f6d5d2a75e5b4f5fa38999993bc41c61706` CI `35785427853` passed backend/control/Flutter/disposable PDF smoke.
34. [x] #141 immutable rejected-hypothesis/missing-data/failure receipts.
35. [~] Byte-identical mirrors do not count as independent corroboration; draft #168 adds pure synthetic source-chain triage for shared upstream, changed same-location versions, missing chain/review receipts, and candidate-only distinct chains. Backend/control/disposable PDF sandbox CI passed on `77a62085eda90a146bf0135bb74bcfd283f6157d`; Flutter check cancelled, NOT full green. Human independence proof and integration remain pending.

## 4. Bounded sessions and database safety
36. [x] Pure bounded one-unit-per-tick session policy.
37. [x] Proposed owner/project SQL + service-role adapter kept outside auto-run migrations.
38. [x] Start/deadline/authorization guards and distinct non-completion state.
39. [x] Research Vitest discovery fixed in #131.
40. [ ] **BLOCKED — explicit disposable DB/cost approval:** isolated DB with no real user data.
41. [ ] **BLOCKED — item 40:** RLS/service-role matrix.
42. [ ] **BLOCKED — item 40:** search_path/SECURITY DEFINER/EXECUTE privilege audit.
43. [ ] **BLOCKED — item 40:** concurrency/crash/lease/cancel/restart/deadline/duplicate settlement.
44. [ ] Resolve late settlement semantics; validate in 43.
45. [ ] Verify cost reservation/attempt cap/failure receipts/stalled-work release in disposable environment.
46. [x] #157 evidence-backed completion verifier; exact verification head `db29abbadcba0ced2acfadabcc3a9d0a3db126c3` passed CI `35694800621`. Durable DB settlement remains separate.

## 5. Worker wiring and unattended acceptance
47. [ ] **BLOCKED — live integration approval:** preserve worker v5/review processor diff/rollback.
48. [ ] **BLOCKED — item 18 + source authorization:** bounded third-party capture/parse executor.
49. [ ] **BLOCKED — DB items 40–45:** immutable evidence writes + one-step Pattern Hop suggestions.
50. [x] Pure provenance-preserving lead dedupe implemented on isolated `feat/ark-research-lead-dedupe-20260922`: collapses only identical explicit canonical keys; preserves source refs, reasons, counterevidence, checkpoints and merged lead IDs; rejects duplicate lead IDs/empty references. Focused tests and deterministic representative-ID permutation regression added. Exact-head Arbor Integration CI runs `35781224058` and `35781257390` passed backend/control/Flutter and real disposable PDF sandbox smoke. No persistence/integration claim.
51. [ ] **BLOCKED — separate scheduler authorization:** default-OFF scoped scheduler.
52. [ ] Deterministic simulated 60-minute session after safe executor + disposable DB exist.
53. [ ] **BLOCKED — explicit benign unattended-run approval:** genuine unattended benign-source hour.
54. [ ] Same-user project isolation and cross-session handoff before Grove/voice attachment.
55. [ ] Real phone/operator acceptance; never infer worker liveness from read-only UI.
56. [ ] Separate production/deployment/scheduler/expenditure approval.

## 6. Epstein public-document analysis and responsible reporting
57. [x] Starter MCC/OIG ledger separates published official findings from open questions.
58. [ ] **BLOCKED — item 18 + separate source authorization:** specific public EFTA original-page verification.
59. [ ] Reconcile testimony/logs/timestamps only after original-source capture.
60. [~] Synthetic-only review preflight drafted; draft #177 adds metadata-only privacy review ledger with withheld/missing-artifact flags and permanent release HOLD (five synthetic tests; CI pending). Actual victim/private-person detection, redaction, human verification and release workflow remain BLOCKED on approved privacy workflow. No real private data processed.
61. [x] Pure synthetic-only classification in draft #163 (observation/conflict/missing context/insufficient evidence/extraction error/unresolved/finding), fail-closed source/context checks and permanent review/privacy HOLD; exact-head CI `57c48a873280f7e358625799b995ee4adfb27998` backend/control/Flutter and real disposable PDF sandbox smoke passed. Workflow integration and real finding review remain separate.
62. [x] Mention/allegation alone is never evidence of a crime.
63. [x] Synthetic-only dated HOLD report draft implemented on #163; retains source record IDs, counterevidence, limitations, unresolved questions and separate release authorization. Exact-head `b164d2f4d3cc402939f32f19f0c82e2a6987c4a8` CI run `35790795485` passed backend/control/Flutter/disposable PDF sandbox smoke. This verifies the formatter/tests only; real original-page citation verification, redaction and publication workflow remain pending.
64. [x] No automatic publication; published discrepancies remain distinct from novel research discoveries.

## Current handoff — 2026-09-22
Verified lineage: #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157 → #158 → #163. #163 is open/draft/unmerged. Its pre-documentation exact head `b164d2f4d3cc402939f32f19f0c82e2a6987c4a8` is fully green in Arbor Integration run `35790795485`: backend test/build, control backend test/build, Flutter analyze/test, and disposable PDF sandbox smoke all succeeded. Supabase Preview was skipped and is not DB evidence.

**Next numbered gate:** item 18 remains BLOCKED on an authorized independently published benign PDF plus manual rendered-page/line-order/page-count/hash review. **Next safe independent work:** item 35 source-chain independence proof/tests, then item 30 durable canonical-index design that does not require DB execution. Items 40–45 remain BLOCKED on explicit disposable DB/cost approval; 47 live worker; 51 scheduler; 58 EFTA source authorization. No external/Epstein/EFTA PDF, production DB, live worker, scheduler, deployment, paid API, private/victim data, merge or publication was touched.

### Exact-head evidence recorded this run
- `57c48a873280f7e358625799b995ee4adfb27998`: item 61 classifier CI green.
- `62832f6d5d2a75e5b4f5fa38999993bc41c61706`: publication-preflight CI `35785427853` green.
- `b164d2f4d3cc402939f32f19f0c82e2a6987c4a8`: report-draft correction CI `35790795485` green across all four engineering jobs.
- #164 remains CI-only bridge; DO NOT MERGE.

## 2026-09-22 source-chain triage handoff
- Inspected canonical checklist at #163 head `46f78ef2c8b8fd04f80d2db5fd78b60ff92f7ba6` and existing `sourceVersion.ts` + tests; existing `isProvenIndependentCorroboration` remains conservative false, not duplicated.
- New isolated draft #168 `feat/ark-research-source-chain-review-20260922` stacks on #163. Pure `sourceChainReview.ts` and six synthetic Vitest tests; never returns proven independence. Item 35 remains [~] until CI and independent human chain verification. No real source capture or real-person data.
- Next numbered gate #18 separately authorized independently published benign PDF/manual hash-page-order review. Next safe item after CI: item 30 canonical-index design, no DB execution. #40 disposable DB/cost, #47 live worker, #51 scheduler, #58 EFTA source all blocked. No merge/deploy/worker/DB/scheduler/paid API/private data/publication.

## 2026-09-22 canonical-index continuation
- Rechecked #168 exact-head CI: backend/control/disposable PDF sandbox SUCCESS; Flutter CANCELLED, so do not claim all green. #168 remains draft/unmerged. Integration plan saved in `EPSTEIN_RESEARCH_INTEGRATION_READINESS_PLAN_20260922.md`.
- Created isolated child draft #170 `feat/ark-research-canonical-index-20260922`, pure `canonicalContentIndex.ts` and five synthetic Vitest cases. Same original bytes group globally for content identity but owner/project aliases are only returned under explicit scope; this is NOT a durable DB index, an access-control implementation, or redirect resolution. Item 30 stays [~] pending CI and DB/source gates.
- Next: check exact-head #170 CI, fix failures; continue item 32 synthetic original-page/context review receipt contract only after inspecting existing implementation. Item 18 approved benign external PDF/manual acceptance remains BLOCKED; item 40 isolated DB/cost approval remains BLOCKED. No merge, deploy, DB provisioning, live worker, scheduler, paid API, private/victim data or publication.

## 2026-09-22 original-page review continuation
- #170 exact-head `574d3a5c027db233d00326bed31d47df090ccc5a` backend/control/PDF sandbox CI succeeded; Flutter was still in progress at last check. No full-green claim. #170 draft/unmerged.
- Inspected existing `pdfPageProvenance.ts`, `pdfPageImageProvenance.ts`, `pageObservation.ts`, and `evidenceStage.ts` before building #172 child. Added `originalPageReview.ts` + five synthetic tests: exact original/image/quote bindings, explicit context/visual/independent review flags, permanent privacy/publication HOLD. Receipt is a *claim* from caller, not proof a human reviewed a real page. Item 32 remains [~].
- Next: check #170/#172 exact-head CI and correct failures; item 33/60 synthetic privacy redaction review design; item 44 late-settlement design. #18 benign public external PDF manual acceptance and #40 disposable DB/cost approval remain blocked. No merge, deployment, database, worker, scheduler, paid API, real source/private-person data or publication.

## 2026-09-22 privacy ledger continuation and saved handoff
- Rechecked exact-head #170 `574d3a5c027db233d00326bed31d47df090ccc5a` and #172 `10df39c834502ce6ad755a65162fcfc199be465f`: backend, control backend, Flutter and disposable PDF sandbox all SUCCESS. Supabase Preview SKIPPED, no database verification.
- Inspected existing `publicationPreflight.ts` and `sessionRunner.ts`; created isolated child draft #177 with metadata-only `privacyReviewLedger.ts` and five synthetic tests. Withhold and missing redaction artifact remain unresolved; a declared artifact is NOT proof of redaction. Permanent privacy/publication release HOLD. No real sensitive text or real redaction. Item 60 stays [~].
- Next: verify #177 exact-head CI and fix failures; inspect late settlement SQL before pure item 44 design. BLOCKED item 18 separately approved benign external PDF/manual review; item 40 separately approved no-cost disposable DB; item 47 live worker; item 51 scheduler; item 58 real EFTA source authorization. No merge/deploy/DB provisioning/worker/scheduler/paid API/private data/publication.
