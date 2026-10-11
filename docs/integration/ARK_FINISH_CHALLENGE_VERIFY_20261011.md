# Arbor — Finish → Challenge → Verify (2026-10-11)

## Purpose
Improve actual reliability and usefulness without expanding architecture. This is
a working-method receipt for the existing 97-task order, **not** a new workstream,
permission grant, deployment order, or evidence of AI sentience.

## Standard working loop
1. **Select one demonstrated problem** already in scope, with ownership, parent
   branch, source head and downstream consumers verified.
2. **List the minimum tests and repair criteria** before editing. Keep failures,
   assumptions, and unknowns explicit.
3. **Repair in owned existing components** on an isolated, deployment-fenced
   source branch. Do not add substitute engines or silently enlarge scope.
4. **Challenge** with negative/ambiguous cases, interrupted sessions, stale and
   concurrent writes, unknown targets, conflicting evidence and authorization.
5. **Verify exact commit SHA** with repeatable source tests, typecheck, readback,
   any applicable database or host evidence. Distinguish mocks from live execution.
6. **Finish or block**. One receipt: changed files, passing/failed tests, what
   actually happened, limitations and exactly what will unlock the next step.
   Only move on after the repair is verified at the *appropriate* acceptance
   layer. A later host acceptance can remain a named blocker while independent
   safe source tasks continue.

## Nonnegotiables
- User STOP, pause, refusal and target changes are never treated as GO.
- Bare GO/NEXT cannot manufacture a task when there is no unfinished goal.
- Conversational checkpoint is not cancellation of a durable ARK objective
  and cannot revoke an external action already dispatched.
- No new permission, paid inference, production, main merge, workers, external
  ingestion, or protected queued objective handling without explicit approval.
- No claims of real-world behavior, autonomy, learning or subjective experience
  from source tests or simulated database mocks.
- Preserve provenance, original ownership, protected blockers and recovery
  checkpoints, including cases where a requested action cannot be completed.

## Reporting
Use concise plain English:
**Fixed | Tested | Still unknown/blocked | Next.**
Record measured effects rather than speed estimates, applause or architectural
complexity. Update the canonical list's task status only with relevant receipts.
Ideas unrelated to the current fix go on the future-work list.

## 2026-10-11 source receipt
- PR #451 holds user-controlled conversational work without submitting a
  durable ARK cancel, tests pause → checkpoint → GO, and protects blocked work.
- Found follow-on source defect: without an unfinished goal, shorthand such as
  GO or NEXT could create a new agency goal named after the shorthand.
- Current narrow repair adds a source guard and regression checks; real
  authenticated hosted interruption/resume, in-flight external action fencing,
  and dispatch cancellation remain distinct acceptance obligations.

## In-flight STOP challenge (2026-10-11)
The actual ARK database RPC cancels task statuses and revokes lease tokens;
completion requires an unexpired matching lease. The runtime did not
revalidate a claim at the immediate pre-executor boundary. Source-only review
adds a heartbeat/lease check before invoking the executor.

**Limit:** This only prevents starting execution when STOP already revoked
the lease. It cannot retract a network request or other effect after executor
entry. A revoked token prevents a later *completion record*, not the physical
side effect. Do not report true interruptible execution or perfect prevention
of concurrent races. For greater authority, require per-capability safe
interruption/cancellation controls, a separately authorized real host canary,
and conservative failure receipts.

## STOP during executor preparation (read-only source validation)
Executor preparation may fetch tool metadata, check owner/grants, and reserve
idempotency keys. The existing worker lease is revalidated before actual
execution; this pass adds another revalidation **before reserving write or paid
operations**, and makes the runner reject a revoked-lease error without
issuing `failTask` on work it no longer owns. Tests challenge STOP just
before and just after a durable operation claim, with zero external tool/model
calls after failed heartbeats. An idempotency claim that precedes a later
STOP can remain pending; it requires reconciliation, never blind replay.

This is cooperative lease fencing, **not** a real-time cancellation channel.
Provider requests already in flight may complete or have external effects.
Actual hosted STOP semantics and action-specific cancellation remain blocked.

## Parallel source lanes — STOP read-retry hold (2026-10-11)
Independent source inspections ran across (1) ARK STOP/lease behavior, (2)
behavior/humor contextual wiring, and (3) existing regression/CI coverage.
Found one bounded STOP gap: a read tool's automatic recovery retry did not
recheck an ARK worker lease between attempts. Added an **optional, trusted**
`beforeAttempt` gate to the existing tool recovery loop, outside provider
failure handling; the ARK executor passes its existing worker heartbeat
through that gate. A revoked lease aborts the retry and cannot be disguised
as a transient provider failure. Standalone/non-ARK callers without that
callback retain their prior behavior.

Humor policy remains source-present but not wired to trusted seriousness,
permission, callback or emotional risk context; avoid invented inputs or
mandatory jokes. Host-wide real interruption and canceling already-dispatched
provider calls remain separate acceptance blockers.

## STOP vs ordinary provider failure (2026-10-11)
Challenge found `acceptanceExecutor.ts` swallowing the exact
`ark_lease_lost` sentinel during paid acceptance capture and representing
revoked authority as an ordinary non-retryable provider failure. This could
cause the worker to attempt `failTask` using a revoked lease. The narrow
repair propagates lease loss unchanged; real provider/capture errors remain
ordinary non-retryable failures. Added negative cases for STOP during
paid-call entry, STOP during event capture, and runner suppression of stale
failure/completion writes. These are mocked controls, not proof of real
external API cancellation.
