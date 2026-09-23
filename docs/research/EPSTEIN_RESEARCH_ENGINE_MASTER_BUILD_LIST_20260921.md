# Epstein public-records research engine — master ordered build list

Updated 2026-09-22. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Verified lineage:** #123 → #131 → #134 → later stacked research drafts → #175 → #180 → #181 → docs handoff #187 → item-45 draft #189. Sibling #177 was deliberately reconciled into #181 rather than duplicated. Last fully verified implementation head remains #181 `4ffd760c4113588325352860148b5b9c8ad974cd`, Arbor Integration CI `35806979345` SUCCESS. #187 is docs-only. #189 is current isolated implementation draft and is **pending exact-head CI**.

Legend: [x] relevant implementation plus exact-head CI evidence exists for the stated scope; [~] partial or remaining integration/manual proof; [ ] required; **BLOCKED** names an intentional gate.

## 1. Preserve existing systems before integration
1. [x] Inventory/synchronize worker-v5 source without deployment.
2. [x] Preserve research/Grove/app branch lineage.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; #181 is verified implementation base, #187 docs child, #189 current isolated draft; #182 remains CI-only, not an integration target.
5. [ ] **BLOCKED — live integration approval:** worker-v5 deployment backup + rollback receipt.
6. [ ] **BLOCKED — live integration approval:** deployed Vercel roots/cron/Firefly auth review.
7. [x] Pinned disposable renderer image/package verified.
8. [ ] Remove temporary CI-only bridge/base triggers before any main integration.

## 2. Capture and parse public PDFs safely
9. [x] HTTPS source identity, `%PDF-`, original-byte SHA-256, bounded capture.
10. [x] Reject HTML/consent impostors, credentials and non-HTTPS locators.
11. [x] Complete physical-page inventory contract.
12. [x] Local Poppler parser uses argument arrays/no shell/no URL fetch.
13. [x] Local-fixture page/time/output bounds.
14. [x] Explicit text/raster/blank/failure states.
15. [x] Restrictive temporary PDF/random temp directory/cleanup.
16. [x] Real Poppler parses benign synthetic PDF in CI.
17. [x] Every page keeps original SHA + independent-review HOLD.
18. [~] Independently published benign PDF engineering acceptance runs in CI against blank 2025 IRS Form 1040: HTTPS fetch, `%PDF-`, 5 MiB bound, SHA output, two-page check, page-separated Poppler text, isolated sandbox render. Verified at `4ffd760c...` run `35806979345`. **Still HOLD:** human rendered-page/line-order review is not automated proof.
19. [x] Page-image provenance/manual source-stamp HOLD contract.
20. [x] Bounded page-batch planning preserving full-file provenance.
21. [x] Executable non-root/no-egress/read-only bounded renderer sandbox; synthetic and benign-public CI paths pass.
22. [ ] Opt-in OCR with image provenance/confidence/human verification; only if required after manual fidelity review.
23. [ ] Glyph/box geometry only if exact visual highlighting becomes required.
24. [x] Blank/image-only/encrypted/inaccessible/parser-failed cannot support absence claims.

## 3. Exact observations and evidence integrity
25. [x] Source-first comparison drafts stay verification/privacy HOLD.
26. [x] Exact selected passage carries page/document/hash/UTF-16 span.
27. [x] Source/excerpt/document/hash substitution detection.
28. [x] Synthetic bytes → Poppler → page → exact quote → comparison test.
29. [~] Immutable evidence persistence design exists; production persistence remains BLOCKED on live integration approval.
30. [~] Content identity vs URL/local ID plus pure tenant-scoped canonical grouping exists; durable production index/final redirect capture remains.
31. [x] Typed one-step evidence promotion.
32. [~] Synthetic reviewer receipt binds original SHA/page/image hash/quote span; real human original-page workflow remains.
33. [~] Explicit-span redaction + metadata-only privacy ledger + publication preflight reconciled in #181. Cross-module tests preserve HOLD. No automatic PII/victim detection or release authorization.
34. [x] Immutable rejected-hypothesis/missing-data/failure receipts.
35. [~] Conservative source-chain independence triage exists; human independence proof remains.

## 4. Bounded sessions and database safety
36. [x] Pure bounded one-unit-per-tick session policy.
37. [x] Proposed owner/project SQL + service-role adapter kept outside auto-run migrations.
38. [x] Start/deadline/authorization guards and distinct non-completion state.
39. [x] Research Vitest discovery fixed.
40. [x] No-cost isolated synthetic PostgreSQL 17 CI service exercises proposed research SQL; no real user data or production DB.
41. [~] Owner/RLS acceptance is exercised synthetically; full service-role matrix remains before production integration.
42. [ ] Security review of search_path/SECURITY DEFINER/EXECUTE privileges remains required before any production application.
43. [x] Disposable CI exercises claim/settlement/idempotency/owner RLS/STOP, deadline/expiry/fencing/revocation, independent-connection concurrency, lock-wait fences and STOP-vs-settlement race. Verified run `35806979345`. Disposable DB evidence only.
44. [x] Advisory late-settlement policy plus SQL lock-time resampling repair verified; database remains authoritative.
45. [~] **IMPLEMENTED ON #189; CI PENDING.** Existing cost reservation and bounded receipts are now joined by disposable PostgreSQL coverage for failed receipt + retry delay, terminal `max_attempts`, stalled active-lease fencing, reclaim after expiry, bounded attempt increment, cost accounting and no false completion. Do not mark [x] until exact-head #189 CI passes.
46. [x] Evidence-backed completion verifier exists; synthetic rehearsal rejects evidence-free completion and never equates budget exhaustion with completed.

## 5. Worker wiring and unattended acceptance
47. [ ] **BLOCKED — live integration approval:** preserve worker-v5/review-processor diff/rollback before wiring.
48. [ ] **BLOCKED — separate real-source authorization:** bounded third-party capture/parse executor for investigation sources. Benign IRS acceptance does not authorize EFTA ingestion.
49. [ ] **BLOCKED — live integration approval:** production immutable evidence writes + Pattern Hop suggestions.
50. [x] Pure provenance-preserving lead dedupe verified; no persistence/integration claim.
51. [ ] **BLOCKED — separate scheduler authorization:** default-OFF scoped scheduler.
52. [~] Synthetic one-tick worker rehearsal: one receipt per tick, STOP fencing, crash/lease-expiry recovery, evidence-free completion rejection. Backend CI verified at #181. Deterministic simulated full persisted session remains after item 45 exact-head verification.
53. [ ] **BLOCKED — explicit benign unattended-run approval:** genuine unattended benign-source hour.
54. [ ] Same-user project isolation and cross-session handoff before Grove/voice attachment.
55. [ ] Real phone/operator acceptance; never infer worker liveness from read-only UI.
56. [ ] Separate production/deployment/scheduler/expenditure approval.

## 6. Epstein public-document analysis and responsible reporting
57. [x] Starter MCC/OIG ledger separates published official findings from open questions.
58. [ ] **BLOCKED — separate source authorization + human original-page workflow:** specific public EFTA verification.
59. [ ] Reconcile testimony/logs/timestamps only after authorized original-source capture.
60. [~] Synthetic privacy contracts remain HOLD; actual victim/private-person detection/human verification/release workflow is not implemented or authorized.
61. [x] Pure synthetic-only finding classification; workflow integration and real finding review remain separate.
62. [x] Mention/allegation alone is never evidence of a crime.
63. [x] Synthetic-only dated HOLD report draft; real original-page citation verification/redaction/publication remains pending.
64. [x] No automatic publication; published discrepancies remain distinct from novel research discoveries.

## Current dependency-ordered handoff — 2026-09-22 19:18 PT
1. [x] Re-opened and verified the master list from #187 head `4d48233e055e9445f0a6239e0ff846f0c329e3e9`; default branch still is not the canonical source for this checklist.
2. [x] Re-checked open research PRs. No newer implementation draft superseded #181 before this run; #187 was docs-only. Created isolated draft #189 from #187 without touching #181/main.
3. [x] Preserved last verified baseline: #181 `4ffd760c...`, Integration CI `35806979345` SUCCESS. No mock-only scope was promoted to verified.
4. [x] Inspected proposed SQL before changing tests: `attempt_count`, `max_attempts`, retry delay, lease expiry reclaim and failed-receipt transitions already existed. No duplicate implementation was added.
5. [~] Item 45 implementation added on #189: `ops/research/disposable-db/60-attempt-failure-stall.sql`, wired into the existing disposable PostgreSQL 17 job. It tests actual PostgreSQL RPC behavior in an ephemeral service, not an in-memory mock. Exact-head CI is pending.
6. [ ] **NEXT:** inspect #189 exact-head CI. If failure, correct the SQL/test coherently. If green, mark item 45 verified for disposable-DB scope and proceed to item 52 deterministic persisted simulated-session acceptance.
7. [ ] After item 52, item 8 cleanup/reconciliation of temporary CI-only bridge/base triggers before any integration review.
8. [~] Item 18 remains engineering-pass/manual-HOLD; human rendered-page/line-order fidelity receipt is still missing.
9. [ ] **BLOCKED:** production/live worker/deploy (#5/#6/#47/#49/#56), scheduler (#51), genuine unattended benign hour (#53), EFTA ingestion (#58), privacy-sensitive processing and publication.

### Saved run receipt
Current isolated draft: #189, branch `feat/ark-research-disposable-attempt-matrix-20260922`. Code/test commits add only disposable synthetic PostgreSQL acceptance and CI wiring. At handoff time exact-head Actions had not yet appeared, so item 45 remains partial and no success is claimed. No merge, deployment, production DB, live worker, scheduler, paid API, private/victim data, EFTA processing or publication was performed.
