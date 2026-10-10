# Batch 5 — saved independence action: uncertain-outcome completion repair

Task scope: A09 completion receipts, A05 read-task round trip, F09 private independence demo. This is execution batch 5 of 19, not historical subject group 5. Parent is PR #387, c4564c91587d0a86c0332080911de53323a965df. Separate research PR #388 is preserved.

## Reproduced defect and repair

In the actual `/api/chat` agent loop, an idempotency claim owned by another execution with no saved result was returned to the provider as `operation_in_progress`. A later provider answer could still produce `complete`. Two regressions failed against unchanged source: an already-owned write, and a write whose side effect succeeded but result persistence failed before restart. Neither case repeated the write, but both incorrectly completed the objective.

`runOpenAIAgencyAgent` now checkpoints immediately when an existing claim has no result. It makes no further provider/verifier request, executes no duplicate action, and invokes neither the result nor completion hook. This preserves the actual chat caller's selected-action marker; the caller persists a checkpoint and returns its existing 202 internal-continuation response. A saved non-null result still replays through the existing result hook without executing the action again. No claim expiry, auto-resend, result fabrication or new executor was added.

Three new regression cases cover completion verification both enabled and disabled, failed-result-save recovery, and later trusted receipt reconciliation. The recovery case executes one synthetic write, fails its receipt save, checkpoints on restart, then replays a trusted saved result with exactly one total write. This is in-process fixture persistence/reconciliation, not hosted storage or a physical app restart.

## Executed validation

- Pre-repair: two new regressions failed (`complete` instead of `checkpointed`); three existing checks passed.
- Post-repair: 224 distinct agency tests passed across 28 files. Initial broad run had two import-time failures because the test-only OpenAI placeholder was absent; those two suites were rerun with `ci-placeholder-not-a-real-key` and all nine tests passed. No real credential or provider request was used. Counts exclude repeated focused checks.
- Backend TypeScript `tsc --noEmit` passed; `git diff --check` passed.
- Existing source-only fencing: six Node tests passed, preserving the sole isolated Preview exception and main/production decisions. The new review branch is fenced from deployments.
- Existing composition manifest refreshed only for changed pinned blobs; all 188 existing source fingerprints passed before adding this receipt's new pin.

An additional scratch process-reopen demonstration was attempted twice and stopped before any action or persistence: tsx CLI IPC failed with EPERM, then loader execution failed on CommonJS/ESM named-import interop. No third attempt and no successful cross-process proof is claimed. The failed scratch driver is not application code and is not part of this repair.

## Per-task disposition

| Task | Current result | Remaining acceptance |
| --- | --- | --- |
| A09 | Reproduced and repaired false completion after an unresolved action; same-ID reconciliation tests pass. Actual `/api/chat` checkpoint caller traced. | Authenticated hosted current-source action, saved verified receipt and reopened readback. |
| A05 | Existing bounded authenticated ARK read-task receipt retained at its proven scope. No new submission or control action. | Its proof does not certify Grove model-backed independence. |
| F09 | Actual callers inspected: `/api/grove/chat` saves unverified replies with empty work receipts and explicit no-execution/no-completion flags; its transcript store rejects execution claims. Agency execution is on `/api/chat`. | Accepted model/runtime, authenticated compatible test host, and explicitly authorized integrated action path. A saved chat reply is insufficient. |

Batch 5 is PARTIAL. This repair advances actual unfinished work; it does not finish all three tasks or certify model initiative, installed-device reopen, live auth/storage, or Grove→LM→ARK execution. No paid call, model download, credential/config/grant/database change, deployment, main merge or duplicate engine. New source remains a draft child for review.
