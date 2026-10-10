# Execution batch 14: ARK controls/checkpoint boundaries

Parent draft PR #398 at `79000df4daff8007cb27b8ce14b9f910e35b9074`, tree `5b3f9a3b75662f0579878c2252a174f84c8a4fe3`. Preserve #397 operating self-model and independent #388. Source repair plus live read-only inspection; no deployment/main merge.

## Actual worker boundary repair

runArkWorkerCycle clamped leaseMs, maxTasks and maxRuntimeMs with Math.min/Math.max without checking finite numeric input. NaN lease reached a claim and failed constructing time; NaN runtime bypassed the elapsed-time comparison; NaN task count silently returned budget_exhausted after checking awaiting verification. Infinities were accepted/clamped and could execute. Reject nonfinite supplied limits with ark_worker_invalid_limit before reading the store, verifying or claiming/executing. Preserve omitted defaults and existing finite clamps; no claim of hard preemption for one long-running executor.

Nine malformed-limit cases failed before repair and pass afterward. Spies assert zero awaiting-verification reads, task claims, verifier calls and executor calls; queued objective and zero task attempts remain unchanged. Tests use existing in-memory store and registry only.

## Live readback, 2026-10-10T03:45:46.387Z

Existing authenticated ARK Preview Fresh connection/project list scoped the read to ARK Preview Smoke Test `9366c350-5d82-49f5-b9ef-862af750e3a0`.
Profile: access=read-and-submit-read-tasks, canSubmitReadTasks=true, canSubmitBehaviorTests=false, canControlObjectives=false. No submission/control was performed.

Status available=true, truncated=false. STOP canary objective `6fb59354-b898-4574-8488-762b41418f44` and task `012df6c6-aaa7-4e24-90b4-e9bd9845ae0a` remain queued with zero attempts/no completion evidence. Two October 7 checkpoint records remain on cancelled tasks. Historical worker-read, blocked-resume and lease-retry tests report completed with stored evidence; retry-exhaustion reports failed. These are prior host records, not execution/acceptance of this new draft.

Dedicated get_ark_submission_gate_status diagnostic tool is absent from the exposed catalog. Its enabled/failedChecks/executionStarted values cannot be reported as measured; use only actual profile and durable readback above. Do not infer global scheduler state from this profile or unchanged snapshot.

## Four task outcomes

| ID | Executed / inspected | Remaining acceptance |
| --- | --- | --- |
| A03 Objective controls | Live profile denies objective-control permission; durable queued STOP canary has zero attempts. Existing source route/MCP grant/STOP transition and cancellation tests pass. | Actual authorized control of the intended objective and durable STOP denial receipt on composed host. No control mutation made. |
| A04 Hosted checkpoint/resume | Live read shows two historical checkpoint records on now-cancelled tasks, historical completed lease/blocked-resume receipts, and failed retry-exhaustion task. Synthetic runner checkpoint/resume, lease recovery, verification retry/no replay pass. | Fresh composed-host process reopen and durable resume; historical receipts do not accept latest draft source. Cancelled canaries remain cancelled. |
| A06 Engineering executor | Existing registry/agency dispatcher/delegate and protected tool boundaries tested; missing/irreversible/high-consequence capabilities remain blocked. MCP read-task capability enum traced. | General engineering execution is not exposed by this read-task connection; real explicitly scoped engineering task/grant and verified result remain unproven. No new executor or live engineering run. |
| A07 Worker/scheduler | Invalid numeric limits repaired before store access; default worker and heartbeat exact-canary/global-execution locks traced/tested. Private Grove one-objective path tested. | Current deployed scheduler/locks, full composed-host acceptance and bounded live run. No activation, flags, grant or schedule change. |

## Verification

Local 174 distinct tests across 29 files: 152 ARK/MCP/private-run tests plus 22 heartbeat/private route/startup/continuity tests. Backend TypeScript passed. Synthetic provider/storage/placeholder credentials and backend network denial; no paid model/database mutation. Existing acceptance integration connects real modules through mocked boundaries, not real inference.

Source pins and six deployment fences checked before publication; exact-head remote CI recorded in PR and assessment after completion. Local/focused/full counts overlap.

Result: Group 14 remains PARTIAL for composed-host/control/engineering/scheduler acceptance, with worker-limit validation repaired. No queued/cancelled task resumed, cancelled, submitted or executed; no new worker/scheduler, engineering executor, research objective, permission/configuration change, paid inference, schema/grants change, deployment or main merge.
