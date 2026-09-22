# Research engine integration readiness plan — PREPARE ONLY

Updated 2026-09-22. This is a review plan, **not permission to merge, deploy, provision a database, run a scheduler, spend money, or ingest Epstein/private-person material**.

## Verified branch lineage and CI
Research stack remains draft/unmerged: #123 → #131 → #134 → #135 → #136 → #139 → #141 → #142 → #144 → #152 → #157 → #158 → #163 → #168. Verify every intermediate branch head and merge base again immediately before any integration. #164 and #169 are CI-only bridges, **DO NOT MERGE**. #168 source-chain review exact-head `77a62085eda90a146bf0135bb74bcfd283f6157d`: backend, control backend and disposable PDF sandbox CI passed at last check; Flutter was still running. Supabase Preview skipped, not DB verification.

## Gates in dependency order
1. [x] Existing source-first research draft, sandbox, bounded parser, provenance, stage promotion, failure receipts, pure lead dedupe, outcome classification and HOLD report format implemented in isolated research branches with earlier exact-head CI evidence recorded in master list. These are draft components, not a running research service.
2. [~] #168 source-chain triage: check Flutter and exact-head CI, inspect any failure; human corroboration proof is still not automated.
3. [ ] **BLOCKED: source authorization** — independently published *benign* PDF in no-egress, non-root, read-only sandbox, with manual original-byte SHA, page count, line order and rendered-page comparison. Do not ingest EFTA/Epstein documents under benign-source permission.
4. [ ] **BLOCKED: explicit disposable DB/cost approval** — verify genuinely isolated, synthetic-only, no-cost resources and ownership. Explain the option and get approval before provisioning. Then run migrations in disposable environment only, RLS/service-role, SQL privileges, concurrency/lease/crash/late-settlement and budget/attempt-cap tests. No production DB writes.
5. [ ] Finish pure canonical source-index and provenance contracts without database writes; independently test cross-project content identity vs tenant-scoped access. Finish privacy redaction and independent original-page review workflow with synthetic data; preflight alone does not redact.
6. [ ] Complete bounded executor and immutable evidence write integration **only after** source and disposable DB gates. Verify real benign-file acceptance, duplicate settlement, cancellation, retry and crash recovery; never infer successful operation from a mock or UI status.
7. [ ] Build and run deterministic simulated 60-minute session, then obtain **separate** approval for a genuine benign unattended hour. Scheduler stays default-OFF.
8. [ ] Audit current worker-v5, Vercel roots, auth, env names, cron, database migration/rollback and backup receipts. Preserve live configuration. Resolve branch stack with reviewed diffs; remove temporary CI PR-base triggers before any main integration.
9. [ ] Same-user project isolation, phone/operator acceptance and cross-session handoff. Test stop/cancel, failure visibility, provenance, privacy holds, and recovery.
10. [ ] Present explicit go/no-go evidence bundle: exact merged candidate SHA, CI links, manual PDF acceptance, disposable DB test receipts, backup/rollback, cost estimate, deployment/worker/scheduler changes, privacy controls and remaining limitations. Ask separately for **merge**, **deployment**, **live DB**, **scheduler**, **paid costs** and **real-source ingestion** as applicable; silence is never approval.

## Switch rule
There is no single safe all-at-once switch. Stage gates: isolated tests → approved benign-source acceptance → approved disposable DB tests → simulated end-to-end → separate benign unattended acceptance → reviewed integration candidate → explicitly approved live changes. If any prerequisite is missing, do not advance that stage. Never enable automatic publication; allegation/association is not proof of wrongdoing.

## Current handoff
Next safe independent work: inspect #168 CI, then pure canonical-index/source identity design and synthetic tenant-boundary tests. First blocked numbered gate: master item 18 benign external PDF review. Next decision needed from Danelle: whether to authorize only no-cost isolated synthetic disposable DB after cost/options are explained; user has requested integration **planning only**, not activation. No merge/deploy/DB provisioning/scheduler/payment/private data/real EFTA capture/publication authorized.
