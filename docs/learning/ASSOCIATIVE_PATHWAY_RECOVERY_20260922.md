# Associative Pathway Layer — recover before reconnecting

Status: isolated draft; not deployed, migrated or attached to ARK or either app. Historical design recovered from Danelle's May 2026 pathway scaffold; new source is a **bounded reconstruction**, not proof of byte-for-byte historical recovery.

## Original purpose and boundary
Input → perception/vestibular → nervous router → associative pathway match → associated systems → executive integration → muscular/tool action only if separately authorized → verified feedback and inspection. It is application-level adaptive wiring, **not** a neural-network training algorithm, memory truth store, independent model, executive authorizer, medical neuroplasticity claim or background learner.

## Recovered operation names
`matchNeuralPathways`, `activateAssociatedSystems`, `updatePathwayWeights`, `createOrStrengthenPathway`, `weakenBadPathway`, `decayUnusedPathways`, `suppressUnsafePathways`, `buildNeuralPathwayDebugTrace`.

## Existing main-branch pieces — do not duplicate
- `apps/backend/lib/memory/reinforceCandidate.ts`: scoped candidate-memory reinforcement, confirmation/use/contradiction distinction.
- `apps/backend/lib/memory/retrievalReroute.ts`: temporary downranking after explicit rejection. A rejection is NOT evidence a durable fact is false.
- `apps/backend/lib/memory/patternHopEngine.ts`: evidence relationship categories, provenance and hypothesis controls.
- `apps/backend/lib/memory/decayHelpers.ts`: existing strength decay calculations for memory, NOT pathways.
- `apps/backend/lib/arbor/continuity/runtimeMemoryProjection.ts`: corrected priorities, unresolved work, runtime handoff.
- `apps/arbor-control-backend/src/selfModelControl.ts`: observation/migration; separate ownership and identity authority.

## What this isolated reconstruction adds
A pure, deterministic owner/project-scoped pathway projection and verified-feedback interface. No database tables or schema changes; no tools, production flags, inference endpoints, network, prompt, private data or autostart. `activateAssociatedSystems` **returns suggestions only** and always `grantsExecution:false`. Strength is routing priority, never factual confidence. Use without verified feedback cannot strengthen; explicit protection keeps corrections from decay; safety HOLD cannot silently clear itself. Exact cues only until evidence-backed semantic routing is reviewed. Synthetic test fixtures only.

## Integration gate, NOT executed in this draft
1. Check original in-chat May scaffold against this reconstruction and review the differences.
2. Reconcile ARK/Layer draft #160's trusted user/project/conversation/selected-file read context and Grove draft #179's verified owner/grants before any host projection. A graph never carries an authorization grant.
3. Define trusted signal + feedback receipt mapping, durable storage, provenance and idempotency with owning ARK lane. Do not substitute `ar_memory_candidates` confidence for a pathway weight or modify it from this module.
4. Test project/user isolation, correction replay, conflicting evidence, adverse outcomes, feature-off behavior and memory-vs-pathway separation; then test real LM output with and without pathway context under identical conditions.
5. Activate only by separate owner-reviewed flag and reviewed branch promotion; no public-app or private-training-data coupling.

This should remain a draft until current ARK/Grove lane owners reconcile exact branch heads. It is not a replacement for existing working services.