# One Arbor agency continuation repair — 2026-10-06

## Failure reproduced from source
The inner agency loops already say not to stop after a successful intermediate step, and the canonical agency state marks `checkpointed` as non-yielding. ARK also durably owns checkpointed actions.

The integration leak is at the host/turn boundary: `runOpenAIAgencyAgent` can return `status: checkpointed`, and the chat route persists that checkpoint **after it has already finalized the checkpoint text as the assistant turn**. That turns an internal execution ceiling/durable continuation state into a user-visible stop, requiring another user message even though no human boundary exists.

This explains the observed "do a chunk -> report -> wait for GO" failure despite correct lower-level policy.

## Contract
- checkpoint != completion;
- checkpoint != human boundary;
- successful intermediate tool call != parent-goal completion;
- only verified completion or a genuine protected/human boundary may intentionally return control;
- unresolved safe/reversible/authorized work remains owned by Arbor/ARK;
- ARK must resume the same durable objective rather than require a fresh user prompt.

## Changes on this branch
- Added `continuationContract.ts` as the shared explicit rule and regression target.
- Added tests proving checkpoint and intermediate-success states do not return control.
- Changed OpenAI agency checkpoint text to an internal-continuation marker.
- Changed ARK delegated checkpoint text to the same contract.

## Remaining integration repair before merge/deploy
The chat route must not call `finalizeAndPersistAssistantTurn` for an ordinary checkpoint and then complete the HTTP turn as though the assistant intentionally yielded. It needs a bounded resume path:
1. persist/checkpoint agency + ARK objective;
2. resume the same objective within the available request budget when possible;
3. if request/runtime budget is exhausted, hand the durable objective to the authorized worker/continuation mechanism;
4. only persist a user-visible assistant turn when complete or genuinely blocked;
5. preserve idempotency and do not duplicate side effects;
6. test interruption/re-entry and ARK checkpoint ownership.

No production activation or merge is authorized by this document.
