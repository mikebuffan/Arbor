# Agency checkpoint resume regression — 2026-09-17

## Observed behavior
During an already-authorized long-running research objective, Arbor repeatedly completed an intermediate research/tool step, returned a user-facing status response, and required another user message to continue.

This violates the intended execution invariant: a tool return, successful intermediate step, or round checkpoint is not parent-objective completion.

## Source evidence
`apps/arbor-control-backend/src/agency.ts` currently defaults `maxRounds` to 12. When that loop is exhausted it returns `status: "checkpointed"` with unresolved work preserved and text claiming the objective is preserved for automatic continuation.

The inner loop correctly verifies completion and calls `continueResponse(...)` while unresolved work remains. The unresolved question is whether every production caller that receives `status: "checkpointed"` automatically re-enters `runAgency` without waiting for a new user turn.

`apps/arbor-control-backend/src/agencyRecovery/executor.ts` separately limits recovery attempts to 6. That is a recovery-route safety bound, not evidence that a parent objective is complete.

## Required invariant
For an already-authorized objective, continue through safe, reversible, in-scope next actions until one of these is true:

1. the parent objective is verified complete;
2. a genuine user boundary is reached (irreversible/high-consequence/authorization-required);
3. no goal-preserving route remains;
4. the execution environment itself ends.

A `checkpointed` result MUST NOT be surfaced as ordinary task completion merely because the inner `runAgency` invocation reached `maxRounds`.

## Next diagnostic action
Trace all production callers of `runAgency` and every branch handling `AgencyResult.status === "checkpointed"`. Confirm whether checkpointed state is automatically re-entered. If not, repair the orchestration layer rather than weakening completion verification or deleting bounded inner-loop safeguards.

## Regression test required
Add an integration test where work requires more than one `maxRounds` window. Assert that:

- the first inner run checkpoints with unresolved work;
- the orchestrator automatically resumes it without user input;
- intermediate success is not emitted as final completion;
- the parent objective eventually returns `complete` or a genuine boundary;
- state/open loops survive the checkpoint transition.

## Active repair note
2026-09-17: diagnosis confirmed at runtime behavior level. The inner agency engine preserves the objective correctly at a checkpoint; the remaining defect is orchestration/re-entry. Do not change the bounded inner-loop safeguards as a workaround. The production caller must consume `checkpointed` internally and re-enter the agency runner while preserving state, until `complete`, `blocked`, or a hard outer execution ceiling is reached.
