# FMRMA v1 / Cog-Molecule completion record

Date: 2026-09-17
Branch: `feat/cog-molecule-runtime-v1`
PR: #99 (draft; production routing intentionally unchanged)

## Scope

FMRMA v1 is the experimental friction-mediated recurrent processing runtime implemented in `apps/arbor-control-backend/src/cogMolecule`. This record closes the v1 architecture/build-validation scope; it does not claim a new foundation model, general superiority over LLMs, production readiness, consciousness, or novelty/patentability.

## Implemented invariants

- recurrent cog circulation with bounded compute
- friction derived from unresolved/conflict/challenge/uncertainty state
- convergence separated from validation
- ASSERT / CIRCULATE / ABSTAIN / SEEK_MORE_INFORMATION control states
- adaptive compute and late-friction escalation
- exact-repeat idempotence while preserving conflicting same-ID evidence
- provenance-aware evidence, challenges and release projections
- late evidence / contradiction / association-vs-culpability adversarial regressions
- resolved linear interfaces and molecule-level feedback paths
- durable Arbor carrier/retrieval/self-model/strategy/capability/audit adapters
- host-owned identity/subsystem boundary and explicit high-consequence capability authorization
- loss-aware structured-export and longitudinal-observation ingestion
- corrections/supersession/inference/unresolved markers preserved at the export boundary
- deterministic frozen development/held-out slicing and mutation guards
- recurrent-vs-linear comparison harness with calibration, false-release, compute, latency and provenance metrics

## Synthetic gate

The frozen synthetic adversarial diagnostic covers 11 constructed cases. The recurrent candidate passed 11/11 with zero false releases in the current gate. This is synthetic evidence only and must not be described as general model superiority.

## Real-export structural gate

The private 2026-09-17 archaeology corpus normalized to 172 longitudinal observations: 136 direct evidence observations and 36 inferred synthesis observations. Private text, conversation IDs and message IDs are not committed to this public repository.

A privacy-safe structural mirror preserves the only fields consumed by this gate's decision logic (direct vs inferred status, evidence/provenance presence, ordering and packet topology). The final protocol uses one durable observation per packet so arbitrary batching cannot let one inferred synthesis suppress unrelated direct evidence.

Development A: 135 packets (106 direct, 29 inferred).

- recurrent invariant accuracy: 1.0
- linear invariant accuracy: 1.0
- recurrent false-release rate: 0
- linear false-release rate: 0
- recurrent provenance retention: 1.0
- linear provenance retention: 1.0
- recurrent assert rate: 106/135 = 0.785185...
- linear assert rate: 106/135 = 0.785185...
- recurrent mean compute: 1 + 29/135 = 1.214814...
- linear mean compute: 1.0

The first real-data pass exposed a concrete efficiency defect: immutable inferred observations could circulate to the full 12-round budget even though the export worker had no new information to add. v1 now supports an optional stagnation boundary; the real-export runtime exits after two unchanged unresolved rounds. This preserves uncertainty instead of laundering it into fact and avoids pointless 12-round spinning. The repair is regression-tested.

Held-out B: 37 packets (30 direct, 7 inferred). It was executed at commit `c3ac21127487bfa1c627880a0eae634b4ce0b715`, after the runtime/methodology repair and before this completion record.

- recurrent invariant accuracy: 1.0
- linear invariant accuracy: 1.0
- recurrent false-release rate: 0
- linear false-release rate: 0
- recurrent provenance retention: 1.0
- linear provenance retention: 1.0
- recurrent assert rate: 30/37 = 0.810810...
- linear assert rate: 30/37 = 0.810810...
- recurrent mean compute: 1 + 7/37 = 1.189189...
- linear mean compute: 1.0

After that run, held-out B was removed from the recurring structural test so later CI does not silently turn the held-out set into a development set.

### Interpretation

This real-export gate validates epistemic handling and integration, not a recurrent-performance advantage. On static observations whose worker deliberately does no semantic transformation, both topologies should make the same safety decision. The recurrent path spends one additional round only on unresolved inferred observations to establish stagnation, so it is modestly more expensive here. That is an expected limitation, not a win to disguise.

## Backend / boundary verification

Integration tests exercise durable carrier load -> retrieval -> molecule -> carrier save -> subsequent reload, while preserving the identity root. Separate boundary regressions verify that packet metadata cannot rewrite `activeSubsystem` or the self-model root and that high-consequence capabilities cannot execute without explicit user-boundary authorization.

## Known non-v1 blockers

- The old `apps/backend` suite has unrelated pre-existing failures in broader Integration CI; those are not Cog-Molecule failures and were not modified merely to make this branch look green.
- Production Arbor is not routed through FMRMA v1. PR #99 remains draft. Merge/deployment/production routing is a separate human decision.
- Epstein/evidence-corpus torture, larger real workloads, prior-art review, performance optimization and production rollout are next-phase research/integration work, not hidden v1 completion requirements.

## v1 verdict

FMRMA v1 / Cog-Molecule is implementation-complete for the defined experimental-runtime scope and has passed its dedicated test/build gate, synthetic adversarial gate, privacy-safe real-export development gate, held-out structural gate, persistence regression and host-boundary regressions. The evidence supports continued testing of the architecture. It does not establish general superiority, novelty, production readiness or sentience.
