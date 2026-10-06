# Pattern Hop controls source acceptance

Built on the tested memory/Pattern Hop integration candidate, PR #238. This patch reuses the existing runner and run/evidence/edge store. It adds a controlled persistence adapter, proposed scoped PostgreSQL functions and an authenticated MCP STOP action.

## Runtime connection

The existing `arbor_pattern_hop_research` agency tool now calls `runControlledPatternHopResearch`. Worker execution requires `ARBOR_ENABLE_PATTERN_HOP_CONTROLS=true`. MCP research submission additionally requires that flag; its existing submission flags and fresh client/project research grant remain required.

A run is acquired with a random lease token before its authoritative state is read. Another continuation cannot acquire that run until release or expiry. The adapter stages each hop's sources and edges, then commits them together with its advanced state in one RPC transaction. The commit checks owner/project/run/token and lease lifetime under the control-row lock. Stale worker saves reject. A delayed provider can outlast the 90-second lease; the worker loses its save authority instead of overwriting a newer pass.

The same existing queue request still uses task idempotency. Distinct continuation requests now also contend for the shared run claim. No second research engine or scheduler is added. Missing control RPCs fail closed; no legacy persistence fallback exists in the controlled agency path.

## STOP

`stop_ark_pattern_hop_run` requires the existing client/project Pattern Hop grant, owned project and owned run before the privileged client is obtained. STOP stays discoverable with controls enabled even when new submissions are disabled.

The database STOP receipt is durable and idempotent. It permanently stops controlled passes on that run ID and preserves the last committed checkpoint and evidence. In-flight retrieval is cooperative: it may finish its current unit, but renewal/commit refuses further progress. STOP does not terminate unrelated ARK tasks, cancel external provider requests, refund existing charges, or reactivate the run. Interrupted/timed-out passes remain resumable; terminal STOP requires a separately designed explicit restart/fork action if later needed.

Known STOP/busy/stale-lease/disabled-control outcomes are reported by the agency tool as blocked rather than completed. SQL/store failures propagate and do not produce success receipts.

## Database proposal and coordinated deployment

`docs/migrations/PROPOSED_pattern_hop_run_controls_20261006.sql` is a proposal, not an applied migration. It is intentionally outside the automatic migration directory. Generate the formal migration with the Supabase CLI only after review.

Functions use SECURITY INVOKER, empty search_path, explicit run ownership/project predicates and service-role-only execution. Control state has RLS and no client-role access. This proposal fences the controlled RPC path; it does not fence old direct table writers. Stop old workers and keep submission off during coordinated application/deployment. Verify no legacy writer remains before enabling the controlled worker. Review shared database grants/RLS independently rather than copying the disposable fixture grants into a live project.

## Verification

- 752 backend tests pass; TypeScript and whitespace checks pass.
- New source tests cover overlapping continuations, atomic persistence payload, STOP during retrieval, stale leases, missing-RPC fail-closed behavior, STOP ownership/grant denial and unavailable storage.
- `scripts/verification/pattern-hop-controls.mjs` executes the existing base schema plus the proposal in disposable PGlite PostgreSQL. It checks competing claims, foreign scope denial, evidence rollback on invalid parent, source/edge persistence and dedupe, expired-token rejection, terminal/idempotent STOP and authenticated-role execution denial.
- Test dependency: `@electric-sql/pglite@0.5.8`, installed temporarily outside the repository without scripts. To reproduce, provide its module directory through `ARBOR_PGLITE_MODULE` and run the verification script from the repository root. No application dependency changed.

This proves local source and disposable PostgreSQL behavior, not live deployment, network-level database concurrency or provider cancellation. No live flags, grants, migrations or schedules changed. Historical embedding calls remain bounded by hop count and cooperative time checks; a hard monetary reservation for those calls is still open. The existing longer research-session runner retains its separate cost reservation and settlement controls.
