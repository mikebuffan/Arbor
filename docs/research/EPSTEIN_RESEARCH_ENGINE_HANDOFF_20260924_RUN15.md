# Epstein research engine handoff — Run 15 — 2026-09-24

## Verified starting state

- Canonical master: `docs/research/EPSTEIN_RESEARCH_ENGINE_MASTER_BUILD_LIST_20260921.md`.
- Verified lineage remains #123 → #131 → #134 → later research drafts → #201 → #207 → #212. Repository PR reconciliation found no newer research implementation superseding #212.
- #212 remains an open draft based on `chore/research-ci-trigger-cleanup-handoff-20260923`; observed pre-handoff head: `f032710e8db2bcea92de9228a33e4f9a7a22cad7`.
- GitHub returned no PR-triggered workflow runs for that exact observed head. Therefore do **not** promote the latest docs/source head as newly exact-head verified. Preserve the earlier exact-head receipts already recorded in the master for their narrow scopes only.

## Dependency-ordered remaining work

1. **Item 18 — HOLD:** human rendered-original vs extracted-text PDF fidelity receipt. Requires preserved benign PDF bytes, page-by-page render/extraction outputs, hashes, and human comparison. Do not infer PASS from parser tests.
2. **Item 22 — CONDITIONAL:** OCR only if item 18 or later authorized image-only sources demonstrate need.
3. **Items 29/30/32/33/35/41 — PARTIAL:** persistence/canonical grouping/human review/privacy/independence/target-role integration remain intentionally incomplete outside synthetic/source scope.
4. **Items 5/6/47/49/56 — BLOCKED:** live integration/deployment/production DB approval.
5. **Item 51 — BLOCKED:** separate scheduler authorization.
6. **Item 53 — BLOCKED:** explicit benign unattended-run approval.
7. **Item 55 — OPEN:** real phone/operator acceptance; never infer worker liveness from read-only UI.
8. **Item 58 — BLOCKED:** separate public-source authorization plus human original-page workflow before EFTA verification.
9. **Items 59/60 — WAITING/PARTIAL:** source reconciliation waits on authorized original capture; actual privacy-sensitive detection/human release workflow remains unimplemented/unauthorized.

## Shared ARK multi-tick audit

The existing proposed-only SQL fixture `docs/research/sql/PROPOSED_ark_scoped_claim_research_checkpoint_retry_window.sql` already contains the narrow source proposal; no duplicate implementation was created. It scopes expired-lease cleanup and objective-failure propagation by `p_only_objective_id`, and proposes resetting attempt count only for `research.session.tick` checkpoints carrying a persisted research-session reference, authorization version, and evidence-ref array. It is explicitly **not an applied migration**.

This source proposal still requires shared-ARK-owner review and disposable PostgreSQL regression evidence for 4+ persisted ticks, restart, injected failure, STOP/no-settle, cross-objective lease isolation, and attempt-budget behavior before any live application. No Preview/production SQL was changed.

## Exact evidence this run

- Re-opened the canonical master from the actual #212 branch.
- Reconciled current research PR search; #212 is still newest research implementation found.
- Read #212 metadata and current changed-file inventory.
- Read the proposed ARK scoped-claim/checkpoint SQL fixture directly from the current branch and confirmed it is proposal-only, not a migration.
- Queried Actions for observed head `f032710e...`; no PR-triggered runs were returned. No CI success is fabricated.

## Next numbered action

Return to **item 18** when the required benign PDF fidelity artifacts/human comparison are available. Independently, the shared ARK multi-tick correction may proceed only through source review + disposable PostgreSQL tests; do not apply it to Preview or production without separate authorization.

## Safety boundary

No merge, deploy, production/Preview DB write, live worker change, scheduler, paid API, external EFTA ingestion, private/victim-data processing, untrusted-file execution, or publication occurred in this run.
