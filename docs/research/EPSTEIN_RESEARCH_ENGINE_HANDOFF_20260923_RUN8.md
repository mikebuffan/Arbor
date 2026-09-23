# Epstein research engine handoff — 2026-09-23 run 8

Current isolated draft: PR #201, branch `test/ark-research-persisted-session-simulation-20260923`.

## What changed in this run

1. Staged item 52 persisted-session disposable acceptance:
   - checkpoint receipt
   - explicit reconnect/new psql session
   - retry-delay idle fence
   - resumed evidence-backed completion
   - second evidence-backed unit
   - persisted cost/receipt accounting
   - unresolved work reaches zero without auto-marking session completed

2. Staged item 42 disposable security matrix:
   - PUBLIC/anon/authenticated worker-RPC EXECUTE denial
   - service-role EXECUTE presence
   - no unexpected RPC overloads
   - no client CREATE on public/auth schemas
   - authenticated read-only table grants
   - anon no table access
   - SECURITY DEFINER/search_path/owner checks
   - RLS enabled
   - synthetic two-owner visibility isolation
   - spoofed request.jwt.claim.role cannot bypass PostgreSQL EXECUTE privileges

3. Added guarded suite runner:
   `ops/research/disposable-db/run-full-safe-suite.sh`
   refuses non-localhost hosts, non-`arbor_synthetic` database, and non-postgres synthetic fixture user before orchestrating the disposable suite.

4. Audited and hardened existing research adapter:
   - malformed persisted `authorized`/`cancellation_requested` no longer coerce to false
   - malformed/blank `completed_evidence_refs` no longer get silently filtered
   - STOP requires database acknowledgement `true`
   - runner does not rewrite already persisted terminal/blocked statuses
   - failed STOP persistence propagates instead of being reported as a successful stop
   - regression tests added

5. Reconciled neighboring interfaces without modifying them:
   - ARK/Layer #160 exact head inspected
   - cognitive assembly #191 exact head inspected
   - research-side compatibility contract added
   - Grove #194/#196 remains separate; research cannot read Grove private transcript/grant/UI state

6. Prepared item-8 cleanup plan for temporary research CI base filters and CI-only PR #198. Cleanup intentionally deferred until item 45 + item 52 evidence is retained.

## Verification status

- Current #201 head at handoff: `98e87c1cbd7925dcf24e745b563cba3bd883e2a8`.
- GitHub connector returned no PR-triggered Actions runs for this head.
- This runtime has no PostgreSQL/Docker binaries, so the new disposable SQL suite could not be executed locally.
- Therefore item 45 remains PARTIAL/unverified on #199, item 42 remains PARTIAL/staged, item 52 remains PARTIAL/staged.
- No result is promoted from source review alone.

## Next safe action

Obtain an approved exact-head disposable PostgreSQL execution path that does not trigger deployment. Run item 45 first. If green, run the full guarded suite including 65 and 70, repair only demonstrated failures, record exact logs/SHA, then update checklist evidence.

## Boundaries preserved

No merge, deployment, production DB, production migration, private grant, live worker, scheduler, paid API, real EFTA/source ingestion, private/victim data processing, Grove transcript access, or publication.
