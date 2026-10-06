# Pattern Hop durable run control — 2026-10-06

Status: **source candidate only**. Draft PR #262 stacks on the green One Arbor ARK-spine
candidate. No live migration, deployment, grant, worker, scheduler, provider call, corpus
ingestion, research execution or production activation is authorized by this branch.

## Problem repaired

The existing Pattern Hop runner already preserved provenance, bounded hops/depth/runtime,
retained failed queries, supported a trusted in-process AbortSignal, and saved resumable state.
Two gaps remained:

1. different continuation request IDs could advance the same saved run concurrently;
2. there was no durable remote STOP latch that survived process restart.

A cosmetic HTTP/MCP STOP flag would be unsafe because an in-flight retrieval could finish and
overwrite the stop with a later checkpoint. This continuation therefore adds persistent run
coordination and makes the actual runner recheck it around traversal writes.

## Proposed database control

`docs/migrations/PROPOSED_pattern_hop_run_control_20261006.sql` is **not** under
`supabase/migrations`; it is not applied automatically.

It proposes five fields on the existing `arbor_pattern_hop_runs` row:

- `stop_requested_at`
- `run_lease_owner`
- `run_lease_token`
- `run_lease_expires_at`
- `control_version`

Server-side RPCs provide:

- one-run-at-a-time claim;
- lease heartbeat;
- fenced release;
- idempotent durable STOP request;
- explicit resume only after no active lease remains.

The proposal keeps the STOP latch set when a worker releases its traversal lease. Only an
explicit resume clears it. Resume does **not** run another pass.

A trigger prevents ordinary table updates from changing the control columns. Each SECURITY
DEFINER RPC enables the internal trigger bypass only for its own update and clears it before
returning. RPC identity checks accept the exact authenticated owner or service-role server code,
and still require exact run/user/project scope.

## Runner behavior

The existing `runPatternHopResearch` remains unchanged while
`ARBOR_ENABLE_PATTERN_HOP_RUN_CONTROL` is not exactly `true`.

When enabled:

1. load/create the exact owned run;
2. claim its traversal lease;
3. HOLD if another continuation owns the lease;
4. STOP immediately if the durable latch is already set;
5. heartbeat/check STOP before selecting a retrieval unit;
6. run the bounded source reads;
7. recheck STOP/lease after providers return;
8. recheck again before evidence/edge/checkpoint advancement;
9. if STOP arrived during retrieval, restore the pre-retrieval frontier and do not persist that
   hop's advancement;
10. release the lease on normal completion or controlled failure. A process crash is fenced by
    lease expiry.

This is cooperative provider cancellation: an already-running database/embedding/provider call
may finish. Its result is not allowed to advance the controlled run after STOP is observed.

## Remote tools

Under the existing Pattern Hop submission permission plus the separate run-control feature flag,
the MCP surface adds:

- `stop_ark_pattern_hop_run`
- `resume_ark_pattern_hop_run`

Both first prove the authenticated project and exact owned saved run. STOP is idempotent.
Resume only clears the latch and reports `executed:false`; a new bounded pass must be submitted
separately.

No general ARK execution permission, scheduler, autonomous loop or new research engine is added.

## Verification

Source tests cover:

- second continuation denied while one lease is active;
- STOP already present before traversal;
- STOP arriving after source reads return but before persistence;
- lease loss;
- controlled-failure release;
- normal checkpoint advancement under a valid lease;
- exact owner/project grant boundary for STOP/RESUME;
- resume does not enqueue or execute a pass.

The dedicated CI also runs the full backend regression/build/TypeScript and a disposable native
PostgreSQL acceptance against the exact proposed SQL. The native fixture checks one lease
winner, a fenced second continuation, trigger-bypass closure, durable STOP, STOP observation by
the active worker, refusal to resume while lease is active, release without clearing STOP,
explicit resume, and foreign authenticated identity denial.

## Remaining live gate

After final source CI is green, the remaining step is an explicit review/approval of the proposed
schema before any hosted migration. Then live acceptance should use one synthetic/owned run,
request STOP while a bounded pass is active, verify the durable frontier does not advance after
the stop latch, restart the host, verify STOP remains, explicitly resume, and run one new bounded
pass.

Until that happens, source/disposable behavior may be called verified; **live durable STOP must
not be claimed**.
