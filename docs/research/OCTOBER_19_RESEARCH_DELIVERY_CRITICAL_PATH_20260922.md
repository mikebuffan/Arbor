# ARK public-records research: October 19, 2026 delivery critical path

Owner objective: safely finish the Epstein public-records research engine and a reviewable files workflow by October 19, 2026. This is a TARGET, not authorization to run external sources, provision paid resources, merge, deploy, schedule, ingest sensitive material or publish. Status checked September 22, 2026.

## Delivery definition (not just a green PR)

- Original lawful public-document bytes retained with original URL, capture time, immutable hash, version/redirect chain and physical page inventory; printed folios separate.
- Reproducible bounded extraction, parser failures and image-only pages explicit; exact cited excerpt traceable to original page and reviewed rendering.
- Every claim linked to evidence, counterevidence and provenance; mirrors/repeated reporting are not independent corroboration; identity and association are never silently converted into misconduct.
- Session state persists; stop, cancellation, lease fencing, deadline, cost/attempt caps and owner/project isolation survive races and restart.
- Privacy-sensitive passages stay private; redacted artifacts require independent human review and explicit separate release authorization. No automatic publication.
- Benign rehearsal and operator acceptance receipts exist. Production readiness requires separately authorized deployment, worker, scheduler and expenditure.

## Critical path and stop/go gates

### Phase A — finish pure-code draft and verify (first)
1. Verify #180 exact-head backend tests/build; repair any failure. Current #180 head prior to this document: b0f3933db7b24f1c21e860a3b83de6798df55f29; NO associated CI run at inspection. #175 CI 35798175895 SUCCESS; sibling #177 CI 35799355793 SUCCESS. Neither verifies combined privacy code.
2. Deliberately reconcile #175 explicit-span redaction and #177 metadata-only ledger, preserving tests, source and privacy HOLD. See PRIVACY_SIBLING_RECONCILIATION_20260922.md. Verify the combined head.
3. Review branch stack and update master handoff; do not blind-merge draft branches or trigger repeated Vercel deployments while the free daily deployment cap is exhausted.

### Phase B — external benign PDF acceptance (separate source/environment authorization)
4. Select independently published lawful benign PDF, pin URL and version, verify original byte hash and redirects; run no-egress bounded sandbox. Manually compare rendered physical pages, line order, printed folios and selected exact passages; record failures as failures. Synthetic fixture passing is not item 18.
5. Decide whether optional OCR is necessary based on observed image-only pages; preserve image provenance and manual review, never invent missing text.

### Phase C — disposable no-cost database (separate explicit approval)
6. Provision only approved isolated DB with no real user/victim data. Apply PROPOSED SQL only there after owner/schema review. Audit RLS, service-role, SECURITY DEFINER, search_path and EXECUTE grants.
7. Exercise race matrix below. Record SQL revision, DB version, seed, logs, observed outcomes and cleanup receipt. Pure TypeScript preflight is not settlement proof.

### Phase D — worker and controlled rehearsal (separate integration authorization)
8. Compare live worker-v5 source with draft, backup/rollback, integrate immutable evidence writes and one bounded unit per tick. Keep external capture and scheduler default OFF.
9. Simulate a deterministic 60-minute session with injected time, cancellation, restart and quota boundaries. No inference of liveness from UI.
10. After explicit authorization, run a genuine unattended one-hour benign-source test, inspect receipts, cost, cleanup, and cancellation; then real phone/operator acceptance.

### Phase E — original public files and reporting (separate source/privacy/release approvals)
11. Authorize specific official public source(s); ingest with original bytes/page-level provenance, review original page and identity ambiguity, build claim↔evidence↔counterevidence graph.
12. Independently review sensitive content/redactions, source independence, citations and unresolved contradictions. Hold output until explicit human release decision. October 19 may yield an internal reviewable evidence packet if publication gates are not met; never imply publication or comprehensive corpus review.

## Disposable DB concurrency/security matrix (plan only, not executed)

| Case | Concurrent action / fault | Required observable outcome |
| --- | --- | --- |
| deadline | settle exactly at or after DB deadline | reject; no completed receipt or extra spend |
| lease expiry | settle exactly at or after DB lease expiry | reject even if worker began earlier |
| fencing | old worker settles after lease reclaimed | reject old token; new owner unaffected |
| cancellation | stop races with claim/settle | no new claim after stop; settlement follows locked DB policy |
| revocation | authorization revoked after claim | reject late settlement |
| pre-start | claim before session start | reject; no unit executed |
| status | pause/block/complete/timebox end during execution | no unauthorized settlement |
| duplicate | same unit settled twice / retry after response lost | one durable receipt and one cost commitment |
| cost | simultaneous reservations near cost cap | cap never exceeded; failed work accounted for |
| crash | process dies after claim or before/after commit | recovery is bounded, no phantom completion |
| isolation | owner/project A tries B's session/unit | denied under tested auth role and RLS |
| grants | anonymous/authenticated EXECUTE on privileged RPC | denied unless explicitly intended |

## Status semantics

- DONE: artifact and scoped acceptance evidence verified.
- PARTIAL: code/design exists but acceptance or integration missing.
- BLOCKED: named approval, environment, source or dependency missing.
- HOLD: no real data release or publication.
- If any required gate is unmet on October 19, report exactly which deliverable is usable and which is not. Do not silently lower acceptance criteria.
