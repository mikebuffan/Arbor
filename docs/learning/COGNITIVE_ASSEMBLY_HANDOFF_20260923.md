# Arbor cognitive assembly — first real connected code seam

**Status:** synthetic, isolated draft stacked on pathway research #190 (itself stacked on recovered #188). This is NOT a deployed brain, a live ARK worker, a hosted LLM, or a synced Grove. No private archive, raw user conversation, model weight, or account credential goes into public GitHub.

## The original distinction (May architecture)
Signal/router **detects** → associative pathway **suggests learned routes** → Pattern Hop **explores and preserves evidence connections** → executive/authorization layer **chooses** → separately authorized execution **acts** → independently verified outcome **informs learning**. Facts and identity corrections have separate authoritative stores. A high path score is *not* true evidence, authority, intent, or worker success.

## Code assembled in this experimental seam
- Reuses `memory/patternHopEngine.ts` (scored candidates and provenance-preserving steps), `memory/retrievalReroute.ts` (downrank a rejected semantic neighborhood), `learning/associativeLearningLab.ts` (learned routing), and `learning/neuralPathwayNetwork.ts` (suggest systems and update verified pathway weights).
- New `learning/cognitiveAssembly.ts`: one bounded (max 4-hop / 32-candidate) read-only cycle. All supplied evidence, learner, pathway, and rejected-neighborhood inputs are checked for same owner/project. Provenance retains source and source family; repeated evidence within a family is NOT independent corroboration. Unsupported route may abstain while exploration proceeds. Results are suggestions and inspectable hop records; never external actions.
- A second function consumes an **independent host-reviewed outcome receipt**, NOT the hop's score or text. It changes only a selected active pathway and optionally the separately trained route model. Retries are idempotent; conflicting reviews or partially saved receipts fail closed pending reconciliation. Caller MUST verify actual owner/project/conversation and evidence/receipt authenticity, then write the three changed state objects atomically through ARK-owned persistence.

## Verified scope
Pure isolated module compiled in strict TypeScript locally (local mirrors of existing main scorer/rerouter); 11 Node assertion cases passed after fixing two test expectation issues and a replay ordering issue. Vitest cases committed for reproducible source-level integration CI. This is not a signed account, restarted process, applied migration, live OpenAI/Qwen interaction, or proof that ARK really persisted state. Full GitHub exact-head tests must be inspected before claiming passed.

## Important limitations
- Pattern Hop here uses already retrieved candidates, not a scheduler or corpus ingester. One serial path, no unbounded search and no automatic research.
- `direct` source/evidence status is only a supplied classification; even an apparently strong match never implies a fact or causal claim has been verified.
- The softmax model learns simple lexical cues. It does NOT parse complex negation, verify human identity, or generate natural language.
- Source family grouping is descriptive and does not prove independent corroboration. No evidence becomes a weight update without a separately checked successful/failed outcome.
- Durable storage, restart recovery, versioned feedback/reversal, independent model-host transport, Text↔Voice and signed Grove provider acceptance remain open.

## Dependency-ordered execution queue
1. [x] Recover historical original May scaffold to private Library; confirm the true scope and original 25 seed pathways.
2. [x] Review present main + draft branch heads and do not duplicate memory, retrieval reroute, Pattern Hop, self-model, objective handoff, or Grove ownership.
3. [x] Reuse existing Pattern Hop, reroute, learned router and pathway logic through a bounded read-only pure seam.
4. [x] Add independently reviewed outcome/replay/partial-state checks so a speculative hop cannot automatically teach a false relationship.
5. [x] Exercise local strict compile and synthetic test harness; commit Vitest specs.
6. [ ] Verify exact-source PR CI and correct any test/build failures.
7. [ ] Reconcile original 25 May seeded routes with current code owners and all existing runtime's actual behavior, not filename guesses.
8. [ ] Coordinate one authenticated **host** interface with ARK/Layer #160 and Grove #179; current Grove transport #166 is signed but still not a live chat route. Never put Grove JWT directly into Firefly or client-supplied owner context into model.
9. [ ] Design/review versioned owner+project+conversation scoped ARK storage and transactional receipt application. Test restart, rollback, wrong scope and contradictory evidence in disposable database.
10. [ ] Thread/Voice/Grove and real Qwen-v0.3/evaluated candidate integration in a private sandbox with approved compute. No production activation without release review/authorization.
11. [ ] Investigate relation learning + language generation on stronger frozen holdouts; do not call a sparse router an independent LLM.

## Release boundary
No merges of stacked parents independently; no deploy, payment, production schema/flag, ARK worker activation, original personal material in the public repo, or model-weight upload. The source branch and handoff are a reproducible proof-of-concept, not a claim that everything is finished.