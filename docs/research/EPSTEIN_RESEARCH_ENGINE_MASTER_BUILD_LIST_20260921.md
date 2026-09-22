# Epstein public-records research engine — master ordered build list

Updated 2026-09-22. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Research stack:** #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157 → item-50 draft branch. Grove/public-app work is separate.

Legend: [x] draft code plus relevant exact-head CI evidence exists; [~] partial/CI pending; [ ] required; **BLOCKED** names an intentionally gated dependency.

## 1. Preserve existing systems before integration
1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove/app branch lineage.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; current research top before item 50 is draft #157 head `0b5f64a722cbf319ea8633a41cf76942481af06e`, stacked on #152.
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
30. [~] #136 content identity vs URL/local ID; durable canonical index/final redirect/cross-project persistence remain.
31. [x] #139 typed one-step evidence promotion; CI `35663024929`.
32. [~] Original-page/context review contract exists; real workflow remains.
33. [~] Privacy/publication gates exist; actual PII/publication-review implementation remains.
34. [x] #141 immutable rejected-hypothesis/missing-data/failure receipts.
35. [~] Byte-identical mirrors do not count as independent corroboration; source-chain independence proof remains.

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
50. [~] Pure provenance-preserving lead dedupe implemented on isolated `feat/ark-research-lead-dedupe-20260922`: collapses only identical explicit canonical keys; preserves source refs, reasons, counterevidence, checkpoints and merged lead IDs; rejects duplicate lead IDs/empty references. Five focused tests added. CI pending; no persistence/integration claim.
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
60. [ ] Redact victim/private-person information before user-visible report/share.
61. [ ] Classify finding/observation/conflict/missing context/insufficient evidence/extraction error/unresolved.
62. [x] Mention/allegation alone is never evidence of a crime.
63. [ ] Dated source-checkable report with counterevidence/limitations/unresolved questions.
64. [x] No automatic publication; published discrepancies remain distinct from novel research discoveries.

## Current handoff
Verified lineage remains #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157. #157 is open/draft/unmerged at head `0b5f64a722cbf319ea8633a41cf76942481af06e`; its item-46 implementation was verified at `db29abb...` by CI `35694800621`. Source inspection found no existing lead-dedupe implementation in the research lane, so item 50 was started once, on a child branch from #157.

**Next numbered gate:** 18 remains blocked on a permissible independently published benign PDF being run through the verified sandbox and manually reviewed. **Current safe independent item:** 50 is implemented but CI pending. After CI, correct any failure before changing its status. No external/Epstein/EFTA PDF, production DB, live worker, scheduler, deployment, paid API, private/victim data, merge or publication was touched.
