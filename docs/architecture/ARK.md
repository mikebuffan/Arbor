# ARK

ARK is Arbor's durable execution carrier. It carries an objective, its causal
task graph, execution position, checkpoints, verification evidence, and
unresolved work across bounded requests and worker restarts.

ARK is a proper name, not an acronym. Arbor remains the controller and source
of conversational judgment. ARK does not replace Arbor or duplicate Arbor's
mutable agency state.

## Invariants

- An objective enters ARK through one idempotent enqueue operation.
- A task runs only after every declared dependency is completed.
- Only one worker may hold a task's lease at a time.
- A lease must be renewed before it expires; an expired lease is recoverable.
- Every bounded interruption writes a sequenced checkpoint and next action.
- Retries use the same task identity and are bounded by `max_attempts`.
- Irreversible and high-consequence tools stop at an explicit user boundary.
- Task completion is not objective completion. The objective reaches
  `completed` only after the completion gate records verification evidence.
- Events and checkpoints are append-only. Current rows use monotonic versions.
- Secrets and credentials do not belong in task payloads, results, errors, or
  checkpoints.

## State flow

An objective moves from `queued` to `running`. Bounded work may return it to
`checkpointed`; missing authority moves it to `blocked`; exhausted retries move
it to `failed`. When all tasks complete, it enters `awaiting_verification`.
Only the verification RPC can move it to `completed`.

Tasks follow the same bounded-execution model: `queued` or `checkpointed` tasks
can be atomically claimed, become `running` under a lease, and then become
`completed`, `checkpointed`, `blocked`, or `failed`.

## Arbor crossing

`enqueueArkAgencyToolPlan` accepts a concrete, already-selected Arbor tool plan
and writes an ARK objective plus dependency tasks. From that point, ARK owns
durable execution state. It stores only the tool capability, arguments, causal
dependencies, and provenance identifiers (`planId`, `turnId`, and optional
`conversationId`). It does not mirror the conversational agency record.

The default worker currently executes the `arbor.agency-tool` task kind using
Arbor's existing tool registry and recovery behavior. Read and reversible-write
tools may run. Irreversible and high-consequence tools are blocked for explicit
review.

## Continuation

The existing authenticated system heartbeat invokes one bounded ARK worker
cycle. Each cycle has both task-count and wall-clock budgets. The queue claim is
atomic (`FOR UPDATE SKIP LOCKED`), lease-protected, dependency-aware, and safe
to repeat. The next heartbeat resumes eligible queued or checkpointed work.

## Completion gate

The default completion assessment requires every task to be completed and to
carry executor verification. The recorded evidence lists each task, capability,
status, verification flag, and attempt count. Failure leaves the objective
blocked with its unresolved task keys; it is never silently promoted.

## Database boundary

The server may enqueue an objective only for a project owned by the supplied
user. Authenticated users may read only their own ARK rows. Enqueue and worker
mutation RPCs are restricted to the service role; direct client mutation of
ARK tables is revoked. Objective
idempotency is scoped to `(user_id, project_id, idempotency_key)`; replay returns
the original objective without adding tasks or events. Reusing a key with a
different normalized objective payload is rejected.
