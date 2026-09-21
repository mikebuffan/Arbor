# Epstein public-records research engine — master ordered build list

Updated 2026-09-21. **One ARK lineage. No second engine.** Source-first public-document research only. Draft code is not deployment, authorization, verified research, or a finding. Use only lawful public material; never publish victim/private-person identifiers.

**Verified research stack:** #123 bounded sessions/evidence policy → #131 exact quote bridge/test discovery → #134 local Poppler synthetic-fixture parser → #135 untrusted-PDF threat model → #136 content-first source/version identity → #139 evidence-stage promotion contract. Grove PRs are a separate lane. Do not independently merge overlapping stacked PRs or overwrite deployed investigation worker v5.

Legend: [x] draft code plus relevant CI evidence exists; [~] partial; [ ] required; **BLOCKED** means the named gate is intentionally not authorized in this build lane.

## 1. Preserve existing systems before integration

1. [x] Inventory/synchronize worker-v5 source on isolated #123 without deployment.
2. [x] Preserve research/Grove branch lineage; no research changes to Grove.
3. [x] Preserve original-byte SHA and physical PDF page separately from printed folio.
4. [x] Review parent heads/open PRs before each child; current research child is #139 on exact #136 head `5a165d4e8c4900b52237313d07a65feee7a30811`.
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
19. [ ] Add page-image rendering provenance and explicit source-stamp capture; never infer stamps from filenames.
20. [ ] Design split/batch handling above local caps while preserving one full-file SHA and original physical-page numbering.
21. [~] #135 specifies disposable non-root/no-egress/read-only-root/resource-capped sandbox requirements; executable pinned sandbox is not implemented.
22. [ ] Opt-in OCR processor with source-image reference, confidence and mandatory human verification.
23. [ ] Per-page glyph/box geometry only if exact visual highlighting becomes required; extracted UTF-16 offsets are not PDF/image coordinates.
24. [x] Current contracts keep blank/image-only/encrypted/inaccessible/parser-failed states from supporting absence claims; integration must preserve this.

## 3. Exact observations and evidence integrity

25. [x] Source-first comparison drafts remain independent-verification/privacy HOLD.
26. [x] Exact selected passage carries page, document ID, original hash and UTF-16 span.
27. [x] Detect source/excerpt/document/hash substitution.
28. [x] Synthetic end-to-end bytes → Poppler → page → exact quote → comparison-draft test.
29. [ ] **BLOCKED — disposable DB first:** persist source capture, extraction run, spans and claim lineage as atomic immutable evidence records.
30. [~] #136 separates content identity from URL/local ID, detects byte-identical mirrors and same-URL changed bytes. Durable owner/project canonical index, final-redirect capture and cross-project persistence tests remain.
31. [~] #139 adds typed `source_quote → verified_observation → interpretation → hypothesis → published_finding` one-step promotion. Exact-head CI is pending; persistence/integration remain.
32. [~] #139 requires original-page + context review before quote becomes verified observation. Real visual-review workflow remains.
33. [~] #139 requires privacy + publication review before `published_finding`; actual PII filter/publication-review implementation remains.
34. [~] #139 preserves explicit counterevidence references; durable rejected-hypothesis/missing-data/failure receipts still required.
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

**Last verified parent:** #136 exact head `5a165d4e8c4900b52237313d07a65feee7a30811`; Arbor Integration CI run 35659500799 passed. #136 includes eight focused source-version tests inside the backend suite.

**Current child:** draft #139, `feat/ark-evidence-stage-contract-20260921`, adds items 31–34 as pure fail-closed contracts/tests. No real Epstein/EFTA files, network fetch, DB writes, worker/scheduler changes, deployment, merge or paid APIs. Exact-head CI run 35662941056 is running; do not call #139 verified until it passes.

**Next safe order:** finish #139 CI/fix any code failure → add durable failure/rejection receipt contract if it can remain pure → design split/batch provenance or page-render provenance → executable sandbox only if it can be implemented and tested without unsafe untrusted-file execution. DB/live-worker/scheduler/public-record analysis stay blocked on their explicit gates above.
