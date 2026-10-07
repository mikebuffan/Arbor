# ARK offline finish — 2026-10-06

**Lane:** everything safe that can be completed without Vercel / hosted deployment.  
**Base:** `integration/one-arbor-current-20261006` @ `3c599ffd655409d8f72116ec857b76dfa646bd50`  
**Child:** `integration/ark-offline-finish-20261006`

No main merge, production deployment, hosted migration, OAuth-scope change, live worker activation, or queue mutation is authorized by this lane.

## Complete offline checklist

### Already present on the One Arbor base

- [x] durable objective/task/checkpoint/event schema
- [x] dependency DAG validation
- [x] objective and task idempotency keys
- [x] targeted objective claims
- [x] atomic task claims with lease owner/token/expiry
- [x] heartbeat lease renewal
- [x] expired-lease recovery
- [x] bounded retry with backoff
- [x] non-retryable failure no-replay
- [x] checkpoint -> continuation
- [x] repeated bounded continuation without replay
- [x] objective task/runtime budgets
- [x] unknown capability -> blocked, never pretend-executed
- [x] completed work cannot be resurrected by state transition
- [x] explicit objective verification gate
- [x] false-completion protection: every task must be completed + executor-verified
- [x] user/project-scoped read model
- [x] durable status separates queued/running/checkpointed/blocked/failed/completed
- [x] Arbor plan -> one durable ARK objective bridge
- [x] targeted ARK execution does not consume unrelated queue work
- [x] high-consequence/irreversible actions stop at authorization boundary
- [x] connected Preview proves checkpoint/interruption/resume across worker invocations
- [x] connected Preview proves durable completed-result readback
- [x] connected Preview keeps queued task distinct from completed task

### Closed in this offline child

- [x] explicit durable STOP/cancel control added
- [x] STOP clears active leases and fences stale worker commits
- [x] repeated STOP is idempotent
- [x] completed objectives cannot be cancelled/resurrected
- [x] explicit blocked-objective resume control added
- [x] resume affects blocked tasks only
- [x] failed/cancelled/completed work is not silently requeued
- [x] unit coverage added for control RPC wrappers and terminal transitions
- [x] disposable PostgreSQL smoke created for STOP fencing + blocked resume
- [x] isolated GitHub Actions lane created; it does not deploy anything

## STOP semantics

ARK had `cancelled` terminal states in its state machine and SQL schema, but the current One Arbor base did not expose a durable cancellation RPC.

This child adds `ark_cancel_objective(objective_id, now)`.

The control:

1. locks the objective;
2. refuses to cancel an already completed objective;
3. returns an already-cancelled objective unchanged on repeated STOP;
4. marks every non-completed/non-cancelled task cancelled;
5. clears lease owner/token/expiry/heartbeat;
6. marks the objective cancelled;
7. appends an `objective_cancelled` event.

Clearing the lease is the durable stale-worker fence. A worker that was active before STOP no longer has a valid token for checkpoint/complete/block/fail persistence.

**Boundary:** STOP cannot reverse an external effect that already occurred before the durable cancellation was recorded. High-consequence tools remain separately authorization-gated for exactly this reason.

## Blocked-objective resume semantics

ARK did not have a separate `suspended` state. The durable equivalent for work paused on authority/capability is `blocked`.

This child adds `ark_resume_blocked_objective(objective_id, now)`.

It intentionally:

- accepts only an objective currently marked `blocked`;
- requires at least one blocked task;
- moves blocked tasks back to `queued`;
- clears stale blocked-task result/leases;
- preserves completed tasks;
- does not requeue failed work;
- does not resurrect cancelled/completed objectives;
- appends an `objective_resumed` event.

A verification-failed objective whose tasks are already completed is **not** silently rerun by this control.

## Live Preview evidence recovered during this lane

The currently connected ARK Preview is available and read-only.

It currently demonstrates:

- a completed bounded two-task checkpoint/recovery objective;
- both tasks required two attempts and each retained checkpoint sequence 1;
- a durable completed task can be read back later with verified result JSON;
- a separate research task remains `queued`, with `attemptCount=0` and no result;
- therefore queued and completed are not conflated;
- current connection permission is `read-only`; it cannot submit/execute the queued task.

The deployed Preview is therefore useful execution evidence, but it is behind the newer source-side integration and cannot prove current-head live worker execution.

## Current exact guarantee

### Proven / source-proven

- durable queue identity
- dependency ordering
- checkpoint/resume
- lease recovery
- retry bounding
- completed-work no replay
- targeted objective isolation
- verification before objective completion
- readback status fidelity
- now: durable STOP fencing
- now: explicit blocked-work resume semantics

### Not yet live-proven on current One Arbor head

- applying the new STOP/resume migration to hosted Preview
- invoking STOP through an authenticated live owner control path
- process-kill while current-head real worker holds a lease
- current-head real worker consuming the existing queued research task
- current-head submit capability from this ChatGPT connection
- live OAuth/project grant needed for read-task submission
- hosted worker scheduling/cron/heartbeat after Vercel is available
- exact current-head end-to-end submit -> execute -> durable result -> readback
- production/main crossing

## Vercel / hosted gate

When Vercel becomes available, the smallest remaining acceptance sequence is:

1. deploy the exact accepted One Arbor/ARK candidate;
2. apply only the reviewed ARK migrations, including STOP/resume if accepted;
3. verify connector profile reports the intended submit permission for the exact project;
4. submit one harmless read-only canary;
5. prove queued -> claimed/running -> completed -> verified -> durable readback;
6. run one interruption/checkpoint/resume canary;
7. run one STOP canary while a harmless task lease is active; prove stale completion fails;
8. run one blocked-authority -> explicit resume canary;
9. verify duplicate submit/restart does not duplicate durable action;
10. leave high-consequence execution and production activation OFF unless separately approved.

## What this lane does not do

- no production deployment
- no main merge
- no Vercel mutation
- no live queue mutation
- no live grants or OAuth scope changes
- no research execution
- no external side effects
