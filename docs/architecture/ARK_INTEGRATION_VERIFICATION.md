# ARK Integration Verification Ledger

Status: **ISOLATED / DO NOT MERGE / DO NOT DEPLOY**

## Anchors

- Recovered ARK checkpoint: `2bc30e1c564ca12104d4d7f7752a5bb387b527b8`
- Recovered branch: `feature/ark-autonomous-work-runner-20260918`
- Current permanence base: `dc4cc15425d5df8c4c981586c6253846c5b02dce`
- Frozen production/rollback anchor: `16e304442a1f05bfb0db531f396a121bb656f3c0`
- Verification branch: `feature/ark-integration-20260918`
- Draft PR: #109

The recovered checkpoint remains preserved unchanged. This branch ports the ARK core onto the current permanence base rather than merging the stale recovered base wholesale.

## Verified by repository inspection

- Current chat agency remains the planner/reasoning layer.
- ARK is beneath the planner through an optional execution delegate.
- The route integration is disabled unless `ARBOR_ENABLE_ARK_EXECUTION=true`.
- Existing direct execution remains the default when that flag is absent.
- Production has not been merged or deployed from this branch.
- ARK objective/task/checkpoint/event tables are user/project scoped.
- Enqueue validates project ownership.
- ARK claims use leases and lease tokens.
- Completion requires every task to be completed with executor verification.
- Targeted execution can claim only one selected ARK objective.
- Read-only ARK status is exposed through a user-authenticated, project-owned endpoint.

## Demonstrated design defects found and repaired on this branch

### Ambiguous reversible-write replay

Recovered ARK converted every tool failure into an exception. The outer runner then retried exceptions, which could replay a reversible write even though the existing agency tool layer intentionally marks an ambiguous write failure non-retryable.

Repair:
- executor-declared failures now carry explicit retryability;
- the runner retries only retryable failures;
- reversible writes use the existing durable agency idempotency ledger inside the ARK executor;
- an unfinished prior write claim blocks replay rather than duplicating the side effect.

### Unrelated-objective consumption

The recovered worker could only claim the next global objective. An interactive planner handoff therefore could have consumed unrelated queued ARK work.

Repair:
- targeted objective claims were added to the store, runner, worker and SQL RPC;
- a one-action agency dispatcher runs only the objective it just enqueued.

### Planner/runner identity loss across chat turns

A new chat turn could otherwise create a new plan identity while a prior durable execution still existed.

Repair:
- the current agency objective can persist one ARK execution pointer;
- a resumed selection reuses the persisted plan identity;
- a different action is refused while the prior durable action remains unresolved;
- the objective id is checkpointed immediately after ARK enqueue.

## Tests present in the branch

The test corpus covers:
- dependency ordering;
- explicit completion verification;
- checkpoint/resume;
- bounded retry;
- non-retryable failure no-replay;
- unknown capability blocking;
- completion-gate retry without task replay;
- targeted objective isolation;
- task-budget continuation;
- expired lease recovery after worker interruption;
- high-consequence tool blocking;
- idempotent reversible-write replay/ownership;
- agency dispatcher completion/checkpoint/blocker mapping;
- planner execution delegate checkpoint behavior;
- durable execution-pointer hydration/resume.

## Still requiring executable evidence

These are **not marked green yet**:

- current-head TypeScript/build;
- current-head Vitest suite;
- migration execution against an isolated database;
- end-to-end chat -> planner -> ARK -> tool -> verification run;
- process-kill/restart test against real persistence;
- long multi-cycle live objective;
- read-only Environment consumption;
- canary comparison against the existing direct path.

Vercel preview builds for this branch became queued during the porting sequence and no build/status exists for the current head yet. Intermediate preview results are not accepted as current-head evidence.

## Authorization boundary

The current chat planner blocks irreversible/high-consequence tool calls before ARK dispatch. ARK also independently blocks such tools. This branch does not add an automatic authorization bypass. A blocked high-consequence action therefore cannot silently become executable.

Ambiguous reversible-write ownership is intentionally fail-closed: an unfinished idempotency claim is surfaced as `operation_in_progress` and will not be replayed automatically.

## Crossing point

Do not merge or deploy this branch until executable evidence above is green and Danelle explicitly authorizes the production crossing.
