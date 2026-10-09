# One Arbor independent completion-evidence guard — source review

This is a **source-only** continuation from draft PR #382 exact head `e23d648566fd49c662c678df7998a48cf0193b9a`, not an ARK operation, deployment or paid-model evaluation.

## Concrete defect
`runAgency` could receive a negative verification for an actual action and on the next loop receive `assess.complete=true`. In the absence of an independent `proveComplete` adapter, it constructed a default positive proof and marked the goal complete, silently overwriting the failed action receipt. A status-only `agencyYieldDecision` could also yield a contradictory complete state carrying explicit `lastVerification.ok=false`.

## Bounded repair
1. If the assessment reports complete while the latest action verification explicitly failed and no separate completion prover is available, checkpoint with the correction retained and persist. **No speculative duplicate execution** and no invented completion.
2. A separate trusted `proveComplete` returning `ok=true` is permitted to establish completion despite the earlier failed action receipt. Existing prover-based recovery is unchanged.
3. `agencyYieldDecision` rejects complete/yield when an explicit negative verification still exists. It preserves the older permissive behavior for legacy missing verification, which this focused repair does not claim to audit.

Synthetic tests cover direct failure→assessment-complete, trusted prover recovery, interrupted/resumed negative state without replay, and contradictory complete-yield policy. No tool integration/ownership, model inference, background processing or privileged action.

An exact-head source-only CI run, strict TypeScript, backend/control regressions, original source fingerprints and deployment ignore gates are required. **This does not demonstrate real-model initiative or live completion.**
