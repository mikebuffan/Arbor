# Epstein public-records research engine — master ordered build list

Updated 2026-09-22. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Research stack:** #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157 → #158 → #163 → #168 → #170 → #172 → #175. Grove/public-app work is separate.

Legend: [x] draft code plus relevant exact-head CI evidence exists; [~] partial/CI pending; [ ] required; **BLOCKED** names an intentionally gated dependency.

## 1. Preserve existing systems before integration
1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove/app branch lineage.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; current research top is draft #175 stacked on #172.
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
30. [~] #136 content identity vs URL/local ID; #170 adds pure in-memory content grouping and tenant-scoped aliases with five synthetic tests. Durable index, final redirect capture, authorization-backed access and DB persistence remain; exact-head full CI still to be recorded.
31. [x] #139 typed one-step evidence promotion; CI `35663024929`.
32. [~] #172 pure synthetic reviewer receipt binds original SHA, physical page, image hash, quote span and explicit independent/context/visual attestation; exact-head `10df39c834502ce6ad755a65162fcfc199be465f` Arbor Integration CI run `35797227509` passed. Real human original-page workflow and privacy review remain.
33. [~] Privacy/publication gates exist; #175 adds explicit-span synthetic privacy redaction review that requires full-visible-text review and always retains independent privacy/release HOLD. It does NOT detect PII or infer victim/private-person status. Exact-head CI pending.
34. [x] #141 immutable rejected-hypothesis/missing-data/failure receipts.
35. [~] Byte-identical mirrors do not count as independent corroboration; #168 pure synthetic source-chain triage handles shared upstream, changed same-location versions, missing chain/review receipts, and candidate-only distinct chains. Human independence proof and integration remain pending.

## 4. Bounded sessions and database safety
36. [x] Pure bounded one-unit-per-tick session policy.
37. [x] Proposed owner/project SQL + service-role adapter kept outside auto-run migrations.
38. [x] Start/deadline/authorization guards and distinct non-completion state.
39. [x] Research Vitest discovery fixed in #131.
40. [ ] **BLOCKED — explicit disposable DB/cost approval:** isolated DB with no real user data.
41. [ ] **BLOCKED — item 40:** RLS/service-role matrix.
42. [ ] **BLOCKED — item 40:** search_path/SECURITY DEFINER/EXECUTE privilege audit.
43. [ ] **BLOCKED — item 40:** concurrency/crash/lease/cancel/restart/deadline/duplicate settlement.
44. [~] Pure advisory late-settlement policy + five synthetic regressions on isolated draft branch; SQL already rejects late/expired/revoked settlement under locks. Exact-head CI pending. Disposable DB concurrency validation remains item 43.
45. [ ] Verify cost reservation/attempt cap/failure receipts/stalled-work release in disposable environment.
46. [x] #157 evidence-backed completion verifier; exact verification head `db29abbadcba0ced2acfadabcc3a9d0a3db126c3` passed CI `35694800621`. Durable DB settlement remains separate.

## 5. Worker wiring and unattended acceptance
47. [ ] **BLOCKED — live integration approval:** preserve worker v5/review processor diff/rollback.
48. [ ] **BLOCKED — item 18 + source authorization:** bounded third-party capture/parse executor.
49. [ ] **BLOCKED — DB items 40–45:** immutable evidence writes + one-step Pattern Hop suggestions.
50. [x] Pure provenance-preserving lead dedupe implemented on isolated #158; exact-head CI runs `35781224058` and `35781257390` passed backend/control/Flutter and real disposable PDF sandbox smoke. No persistence/integration claim.
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
60. [~] #175 explicit-span redaction contract is synthetic-only and remains HOLD. Actual victim/private-person detection, human verification and release workflow remain BLOCKED on approved privacy workflow. No real private data processed.
61. [x] Pure synthetic-only classification in #163; exact-head CI `57c48a873280f7e358625799b995ee4adfb27998` passed. Workflow integration and real finding review remain separate.
62. [x] Mention/allegation alone is never evidence of a crime.
63. [x] Synthetic-only dated HOLD report draft implemented on #163; exact-head `b164d2f4d3cc402939f32f19f0c82e2a6987c4a8` CI run `35790795485` passed. Real original-page citation verification, redaction and publication workflow remain pending.
64. [x] No automatic publication; published discrepancies remain distinct from novel research discoveries.

## Current dependency-ordered handoff — 2026-09-22 16:34 PT
- Verified #172 open/draft head `10df39c834502ce6ad755a65162fcfc199be465f`; Arbor Integration CI `35797227509` completed SUCCESS. This verifies synthetic original-page receipt code/tests only, not a real human review.
- Created isolated child draft #175 `feat/ark-research-privacy-redaction-review-20260922`: explicit-span synthetic redaction + five tests. It intentionally performs no PII/victim detection and never clears release; CI pending.
- Next safe independent item after #175 CI: item 44 pure late-settlement semantics and tests, after inspecting current session/settlement code to avoid duplication.
- BLOCKED: #18 independently published benign external PDF/manual rendered-page/hash review; #29/#40–45 disposable DB until explicit no-cost isolated DB approval; #47 live worker; #48 real third-party executor; #51 scheduler; #53 unattended benign hour; #58 EFTA original-source capture; real privacy-sensitive processing and any publication.
- No merge, deployment, production DB, live worker, scheduler, paid API, real EFTA/Epstein source, private/victim data or publication touched.

## 2026-09-22 late-settlement continuation (isolated draft)
- #175 exact head `284be7d5e6f5f721f756494f1b66001f5d3469ad` Arbor Integration CI run `35798175895` SUCCESS (workflow conclusion); not real-data privacy acceptance.
- #177 is a sibling of #175, not merged or silently duplicated. Its privacy ledger and #175 explicit-span redaction remain separate until deliberate integration review.
- Inspected existing `sessionRunner.ts`, `sessionPolicy.ts`, and proposed SQL settlement RPC. SQL already rejects deadline/lease expiry, terminal or paused status, cancellation and revoked authorization under session/unit locks; no duplicate RPC created.
- Added `lateSettlementPolicy.ts` and five synthetic tests on `feat/ark-research-late-settlement-contract-20260922`, stacked on #175. This is advisory fail-closed preflight, NOT atomic authorization or durable DB proof. Database RPC remains the settlement authority.
- Next: exact-head CI and correct failures; reconcile sibling #177 without overlapping implementation; item 43 disposable DB race/lease/settlement tests only after separate no-cost isolated DB approval. Item 18 benign external PDF/manual review remains separately gated. No merge, deploy, production DB, worker, scheduler, paid API, real EFTA/private data or publication.
