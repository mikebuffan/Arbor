# Epstein public-records research engine — master ordered build list

Updated 2026-09-21. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Research stack:** #123 bounded sessions/evidence policy → #131 exact quote bridge/test discovery → #134 local Poppler synthetic-fixture parser → #135 untrusted-PDF threat model → #136 content-first source/version identity → #139 evidence-stage promotion contract → #141 research outcome receipts → #142 bounded PDF batch planning → #144 held page-image/stamp provenance contract. Grove and public-app PRs are separate lanes. Do not independently merge overlapping stacked PRs or overwrite deployed investigation worker v5.

Legend: [x] draft code plus relevant exact-head CI evidence exists; [~] partial or CI pending; [ ] required; **BLOCKED** means the named gate is intentionally not authorized in this build lane.

## 1. Preserve existing systems before integration

1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove/app branch lineage; no research changes to those lanes.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; #141 from #139 `9699ce8fee510979ffc9909220752f49a968a083`; #142 from #141 `a8909b880d4d4ab107244f165a20a51d593b7024`; #144 from #142 `d623dbc7281f518b74f0330e63228fdf92b7999d`.
5. [ ] **BLOCKED — live integration approval:** capture reviewed worker-v5 deployment backup + rollback receipt before live changes.
6. [ ] **BLOCKED — live integration approval:** confirm deployed Vercel roots/cron and Firefly auth immediately before integration.
7. [~] Poppler is installed in CI for harmless fixture tests; immutable sandbox runtime/image digest still required.
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
18. [ ] **BLOCKED — sandbox gate:** independently published benign PDF acceptance + manual rendered-page/line-order verification must wait for executable untrusted-file isolation.
19. [x] #144 adds pure page-image byte-hash/original-page/renderer metadata receipt and explicit manually attested source-stamp candidate, always HOLD. Exact-head Arbor Integration CI run 35672651469 passed on `e0805c884a57c79b1d158cafacced7ffd1eb4a97`. It does NOT render a PDF, decode PNG pixels, authenticate the renderer/reviewer, or replace independent visual/privacy review.
20. [x] #142 adds pure bounded page-batch planning above the 128-page local ceiling while preserving one full-file SHA, original document page count and original physical-page numbering; exact-head CI on `d623dbc7281f518b74f0330e63228fdf92b7999d` passed. Executable byte splitting remains blocked on sandbox design.
21. [~] #135 specifies disposable non-root/no-egress/read-only-root/resource-capped sandbox requirements; executable pinned sandbox is not implemented. **Next implementation item.**
22. [ ] Opt-in OCR processor with source-image reference, confidence and mandatory human verification. Depends on item 21 for untrusted inputs.
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
48. [ ] **BLOCKED — sandbox item 21:** bounded authorized capture/parse executor.
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
58. [ ] **BLOCKED — executable sandbox + source authorization:** verify physical pages/images of specific public EFTA records against original OIG report.
59. [ ] Reconcile testimony/logs/timestamps only after original-source capture; state what each source can establish.
60. [ ] Redact victim/private-person information before any user-visible report/share.
61. [ ] Classify: established public finding / corroborated observation / apparent conflict / missing context / insufficient evidence / extraction error / unresolved.
62. [x] Policy invariant: name/address-book/flight-log mention/allegation alone is never evidence of a crime.
63. [ ] Dated source-checkable report with counterevidence, limitations and explicit unresolved questions.
64. [x] No automatic publication; official published discrepancies remain distinct from novel research discoveries.

## Current handoff

**Verified research lineage:** #139 exact head `9699ce8fee510979ffc9909220752f49a968a083` passed Arbor Integration CI run 35663024929; #141 exact head `a8909b880d4d4ab107244f165a20a51d593b7024` passed configured CI; #142 exact head `d623dbc7281f518b74f0330e63228fdf92b7999d` passed configured CI; #144 exact head `e0805c884a57c79b1d158cafacced7ffd1eb4a97` passed Arbor Integration CI run 35672651469.

**#144 result:** held page-image/source-stamp provenance contract is now verified at its exact head. This is provenance plumbing only, not evidence that an external PDF was safely rendered or visually verified. No real Epstein/EFTA files, network fetch, DB writes, worker/scheduler changes, deployment, merge or paid APIs were used.

**Next numbered item:** 21 — implement and verify a pinned disposable non-root/no-egress/read-only-root/resource-capped renderer sandbox using harmless synthetic fixtures only. Item 18 (independently published benign PDF acceptance) remains BLOCKED until that sandbox exists. Items 40–45 remain BLOCKED pending explicit disposable-DB/cost approval; live worker, scheduler, deployment and public-record analysis remain separately gated.
