# ARK / Agency / Archive Continuity — source completion and live gates
Date: 2026-10-06

This lane is a child of the current One Arbor source head. It must not be merged, deployed, or used to mutate hosted state independently. Reconcile it selectively into the canonical integration candidate after review.

## Complete lane checklist

### ARK / agency
- [x] Verify current ARK read/submit authorization boundaries.
- [x] Verify readback distinguishes queued/running/checkpointed/terminal state from completed.
- [x] Preserve the existing queue/lease/checkpoint/worker engine; do not build a second worker stack.
- [x] Reconcile the missing backlog-continuation, completion-evidence, and bounded torture helpers from the existing agency lane.
- [x] Verify checkpoint is continuation rather than user handoff.
- [x] Verify interruption + expired lease can resume on a replacement worker.
- [x] Verify bounded retry and exhausted/non-retryable failure behavior.
- [x] Verify duplicate side effects are suppressed by stable idempotency ownership.
- [x] Verify per-objective run budgets do not imply completion.
- [x] Verify completion requires parent-goal evidence, not the latest successful action.
- [x] Verify unrelated foreground work can suspend and later restore an unfinished objective.
- [x] Verify STOP/cancel is terminal for unfinished objective/task state, including awaiting-verification objectives.
- [x] Add the strongest safe continuity torture workflow to this lane.
- [ ] Live task submission -> worker execution -> durable result -> readback: BLOCKED by current read-only MCP grant/deployment.
- [ ] Live durable general-ARK STOP command: BLOCKED because current source exposes terminal cancelled semantics but no owner-facing cancel RPC/tool in this lane.

### Archive / continuity
- [x] Preserve the existing normalized archive and completed batch-0 work. No archive ingestion is performed by this lane.
- [x] Preserve existing checkpoint resume; do not restart batch zero.
- [x] Verify manifest fingerprint binds target owner/project, parser version, exact source hashes, normalized content hash, batching options, and batches.
- [x] Upgrade the next successfully saved import checkpoint to schema v2 with explicit target/parser/normalized-hash binding while accepting/reverifying the existing v1 checkpoint.
- [x] Bind chronological reader cursors to owner/project/source/conversation/message/index/content hash and reader version.
- [x] Accept a verified legacy reader cursor once and upgrade the next cursor to v2 rather than breaking old progress.
- [x] Verify owner/project isolation and changed-source rejection.
- [x] Verify idempotent restart after destination commit but checkpoint-save failure.
- [x] Preserve the historical-instruction firewall for raw archive recall and episodic recall.
- [x] Add bounded semantic-embedding backfill plumbing that is owner/project/source/hash bound and default-closed.
- [x] Verify semantic backfill restart skips already embedded rows and rejects changed source text before provider work.
- [x] Preserve startup runtime hydration/capture and cross-thread correction recovery tests.
- [x] Make episode continuity summaries scope-safe and require durable write/readback before reporting success.
- [x] Verify corrections, stale aliases, supersession, revoked rules, and foreign-owner/project isolation remain conservative.
- [ ] Run semantic backfill against hosted archive: LIVE/EXTERNAL GATE; not authorized or needed for source acceptance.
- [ ] Import remaining archive batches: LIVE/OWNER GATE; intentionally untouched here.

## Current live evidence observed read-only

The connected ARK Preview currently reports read-only access: no read-task submission and no behavior-test submission from this client.

Readback of already-owned durable tasks proves status distinction:
- the two existing checkpoint/resume smoke tasks read back as completed with two attempts and verified results;
- the existing queue-bridge smoke task still reads back as queued with zero attempts and no result.

That is evidence that readback works and completed is not conflated with queued. It is not proof that a current worker is active.

The existing archive continuity state remains at the previously completed first batch: 106 imported historical rows and resume checkpoint nextBatch=1 of 662. This lane does not change that hosted checkpoint or re-normalize the export.

## Authorization boundary

Current source registers submission only when ARBOR_ENABLE_ARK_MCP_SUBMISSION=true. A submission also requires the narrow ark.submit.read_tasks permission and a server-owned app_metadata grant matching the authenticated client and exact project. User-editable metadata is not authority. The existing submit tool is limited to the already-registered bounded read capabilities and uses a stable request ID for queue idempotency.

Readback remains available independently of submission.

## Exact live acceptance after explicit approval

1. Reconcile this lane into the chosen canonical One Arbor candidate and record the exact resulting SHA.
2. Run exact-head backend tests, standalone TypeScript, production build, and the continuity torture workflow.
3. Deploy that exact SHA to the non-production ARK Preview only.
4. Grant only ark.submit.read_tasks to the exact authenticated client/project and enable ARBOR_ENABLE_ARK_MCP_SUBMISSION for Preview. Do not grant research, behavior acceptance, deployment, inference, billing, secrets, or production permissions.
5. Reconnect/refresh the client if required, then verify get_arbor_profile reports read-task submission enabled for the intended project only.
6. Submit one harmless existing read capability with a fresh stable requestId. Record objectiveId/taskId and initial durable status.
7. Poll get_ark_task_result. Require an observable durable transition ending in completed with a verified result. queued/running/checkpointed must never be presented as complete.
8. Re-submit the identical request with the same requestId. Require the same durable action identity/result and no duplicate side effect. Reuse the same requestId with changed input and require rejection.
9. Run the controlled checkpoint/interruption fixture: claim -> checkpoint -> terminate worker -> resume with a replacement worker after lease/checkpoint eligibility. Require one logical action, monotonic checkpoint sequence, and final verified completion.
10. Run the lease race fixture with two workers. Require one valid lease owner; the loser must not complete or checkpoint the task.
11. Run transient retry and exhausted retry fixtures. Require bounded backoff, stable task identity, and failed != completed.
12. Exercise suspended-objective resume through the runtime host: interrupt with unrelated foreground work, complete it, and require restoration of the prior unresolved objective without another user trigger.
13. For general ARK STOP, first add/review an owner-scoped durable cancel RPC/tool using the existing cancelled terminal state. Then test STOP while queued, running/checkpointed, and awaiting verification; all must prevent later claim/resume. This is not authorized in hosted state by this lane.
14. For archive resume, load the existing v1 nextBatch=1 checkpoint, reverify batch 0 at destination, process exactly one next bounded batch, and require the saved checkpoint to upgrade to v2. Never restart at batch 0.
15. Run one bounded semantic-backfill batch only if separately approved. Require owner/project/source/hash revalidation, no overwrites, and idempotent rerun.
16. Verify a durable episode summary survives a fresh session and is recalled only as non-control context.
17. Revoke the temporary Preview submission grant/flag when acceptance is complete unless ongoing submission was explicitly approved.

## Remaining blockers

- Current connected ARK Preview client is read-only, so no new task can be submitted from this conversation.
- One existing queue-bridge smoke task remains queued with zero attempts, so live worker liveness is not demonstrated now.
- General ARK has cancelled terminal semantics but this lane does not expose a live owner-facing cancel mutation; that requires separate protected review.
- Hosted archive import, semantic provider calls, grants, migrations, deployment, inference activation, and production changes remain intentionally untouched.
- Vercel deployment contexts have recently been rate-limited; source CI can still be evaluated independently.
