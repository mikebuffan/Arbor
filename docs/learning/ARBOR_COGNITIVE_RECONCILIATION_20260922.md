# Arbor cognitive archaeology — implementation ledger and priority queue

**Snapshot:** 2026-09-22/23 UTC. Based on inspected `main` source tree, selected file bodies, draft #188, and dated master integration handoff #149; it is NOT a full repository execution audit or proof any main module is deployed. Original May design requires historical byte-level verification before it is described as fully recovered.

## Actual recovered items vs source analogues

| Historical idea | Source already present in `main` | Gap / next question | Confidence |
| --- | --- | --- | --- |
| Neural Network / Associative Pathway Layer | `lib/memory/reinforceCandidate.ts`, `retrievalReroute.ts`, `patternHopEngine.ts` | No verified unified `lib/learning/neuralPathwayNetwork.ts` on `main`; #188 reconstructs pure separate draft. Do NOT treat memory confidence as a pathway weight. | Inspected source / draft |
| Plasticity / rerouting | `lib/memory/retrievalReroute.ts`, `lib/memory/decayHelpers.ts` | Context-local rejection does not prove enduring pathway updates; original neurocognitive scaffold not reconciled. | Inspected source |
| Signal/body-system router | `lib/arbor/runtime/arborRuntime.ts`, `knowledgeRouting.ts`, `agencyPolicy.ts` exist | Match original nervous/vestibular/executive/body atlas modules against actual imports and behavior; filenames alone do not prove equivalence. | Tree only |
| Executive agency and open loops | `lib/arbor/agency/engine.ts`, `continuation.ts`, `workRunner.ts`, `verifier.ts` | Owned, authorized real worker proof is separate from unit code and ARK Preview fixture; do not turn routes into work grants. | Tree + dated #114/#147 handoffs |
| Identity corrections | `lib/arbor/runtime/corrections.ts`, `correctionPromotion.ts`, `runtimeState.ts` | Distinguish durable identity fact, conversational correction, and routing hypothesis; test pronoun switching. | Tree + inspected runtimeState |
| Longitudinal continuity | `lib/arbor/continuity/runtimeMemoryProjection.ts`, `state.ts`, `store.ts` | Grove private trusted host and model turn persistence remain separate release gates. | Inspected projection + dated #149 |
| Self-audit/update | `apps/arbor-control-backend/src/selfModelControl.ts`, `selfModelMigration.ts`, `selfModelObservations.ts` | Verify live wiring and authority; proposed pathway learner cannot silently rewrite identity/self-model. | Inspected control service + tree |
| Evidence relationships | `lib/memory/patternHop.ts`, `patternHopEngine.ts`, `patternHopStore.ts` | Evidence association is NOT verified causation or independent corroboration. | Inspected source/tests |
| Neural-route learning experiment | No verified equivalent in selected `main` sources | Stacked synthetic lab adds softmax weights feeding #188 suggestions only; not a new LLM. | New experiment |
| Grove ↔ ARK/Layer ↔ private LM | Separate draft stacks #160/#179/#166 | Owner/JWT/grants, actual model host/phone, release authorization; no merge/deploy assumed. | Dated PR handoffs |

## Safe execution queue

- [x] Verify #188 exact source and CI before reuse (integration CI success on recovery head `fce042d40a27372c889e4795538a16ad75a81388`).
- [x] Map known modules to original pathway operations without copying private training material to public GitHub.
- [x] Specify a tiny mathematical learning rule and confidence/abstention boundary; no claims that rules replace transformer mathematics.
- [x] Implement a pure owner/project-scoped learned-route experiment with receipt idempotency; return suggestions only.
- [x] Freeze and run small synthetic train/holdout comparison; preserve both failures and limits.
- [ ] Commit experiment as draft child; verify full exact-head GitHub CI on that child.
- [ ] Recover and compare the *original* May source, not merely names; audit every intended function and source location.
- [ ] Review cross-module duplicate semantics; decide which system remains authoritative for identity, correction, routing and source evidence.
- [ ] Build typed, provenance-preserving relation learner with conflicting/hypothetical edges and speaker-owner resolution.
- [ ] Versioned durable state, atomic trusted feedback/rollback and no cross-user/project leakage; audited disabling and source deletion.
- [ ] Freeze prospective hard holdout suite; strong baselines, perturbations, long-horizon correction, negative instructions and confidence calibration.
- [ ] Demonstrate new relation transfer independently of Qwen. If it fails, record failure and iterate one mechanism at a time.
- [ ] Independently explore a language-generation architecture only after route/relation learning is supported, not call a router an LLM.
- [ ] Integration reviews: ARK/Layer #160 ↔ Grove #179 private auth/conv; independent LM host #166; no automatic PR merges, deploy or ARK worker activation.
- [ ] Private phone Text/Voice continuity and production gates; public alpha and Epstein evidence lane remain separate.

**User action now:** none required for read-only/source-local prototype; owner approval only at actual sensitive-data, merge, paid service, autonomous work, or production gate.