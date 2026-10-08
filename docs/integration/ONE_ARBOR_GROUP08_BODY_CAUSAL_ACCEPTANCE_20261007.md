# ONE ARBOR — Group 08 Body / Felt-Life / Neural / Reviewed Strategy Causal Receipt
Date: 2026-10-07 · D01 D02 D03 D04 D12 only · Review-only, source not deployed.

## Source and collision baseline
- Integration source PR #340 exact head `595375d525cf561172449726ed0c086ab4ece7db` is unmerged and not equivalent to Preview deployment PR #322. Group 08 branch starts from #340 and edits only owned cognitive bridge and Felt-Life Atlas, plus NEW synthetic tests, NEW dedicated workflow, and this ledger.
- PR #336 at `0f85807943734ee603b070912ec80bb633b68e79` already completed synthetic compatibility coverage for 25 neutral-index May dispositions. Its Actions run 37690614150 reports 55 targeted tests green (three source files), standalone TypeScript green. This **does not** prove actual historical seed behavioral activation.
- Group 09 owns Truth Arbiter/Guardian/Veto/DecisionWorkspace and general decision/evidence authority. Group 06 owns canonical identity/self-model. Group 08 **did not edit** those modules. Body and pathway routing are advisory, without execution/learning authorization.

## Causal integration map — reusing what exists
| Signal / stage | Existing implementation | Causal claim that source can support | Protected boundary |
| --- | --- | --- | --- |
| Inputs / owner-scoped continuity | `lib/arbor/continuity/*`, prompt context, existing scoped cognitive host/port | Current explicit goal/corrections feed the next ephemeral view | No made-up history, scope/version must come from host |
| Body governor | `lib/arbor/body/bodySystem.ts`, `regulation.ts`, `gastricSignals.ts`, `functionalSystems.ts` | Derives ephemeral orientation, pace, next-action hint and blockers | Functional biological **metaphors**, not sensations or diagnoses; no durability |
| Felt-Life Atlas | `lib/arbor/feltLife/atlas.ts` | Lexical sensory cues yield bounded `hypothesis-not-verdict` signature with ceiling 0.82 | No feeling assertion; no personal memory write; no clinician-like diagnosis |
| Cognitive bridge | `lib/arbor/runtime/cognitiveBridge.ts` | Converts actual body/eligible Felt hypotheses to advisory attention, interpretation and route | Blockers, verification, authorized unfinished work outrank an incidental sensory match |
| Learned route suggestions | `lib/learning/neuralPathwayNetwork.ts`, `associativeLearningLab.ts` | Deterministic, scoped exact-cue proposals / bounded weighted route labels | Strength is priority, not truth probability; cross-owner/held paths not activated; `grantsExecution=false` |
| Evidence/roundabout | `lib/arbor/runtime/knowledgeRouting.ts`, `lib/learning/cognitiveAssembly.ts`, `cognitiveBodyPreview.ts` | Contradiction routes HOLD, error/correction BACKTRACK, unresolved objective CONTINUE; hops are source-traced | Investigative retrieval does not prove independent corroboration or authorize task execution |
| Reviewed outcome -> later strategy | `applyReviewedCognitiveOutcome`, `trainVerifiedPathwayExample`, `updatePathwayWeights` | **Synthetic** positive receipt increments selected active route 0.1; reviewed failure decrements 0.16; explicit counterexample can train alternative route once; exact receipt replay idempotent | Caller must independently authenticate + verify receipt; pure method cannot certify its supplied "verified" string; host must persist atomic snapshots |
| Separate agency strategy retention | `lib/arbor/agency/strategyCandidates.ts`, `strategyRetention.ts` | Existing mechanism records candidate confirmations; not proof this Body bridge caused better decisions | Agency owner controls persistence/outcome verification; do not patch Group 02/09 files |

## 25 historical May-route dispositions — precise held/preserved scope
- Indices **1–25** are represented once each in `lib/learning/__tests__/maySeedRouteCompatibility.test.ts`, neutral synthetic IDs (private May source examples **not** copied).
- `map-split`: **11** indices (1, 2, 3, 8, 9, 11, 14, 16, 17, 21, 24). `preserve`: **10** (4, 5, 7, 10, 13, 15, 18, 20, 22, 23). `hold`: **2** (6, 25). `retire-auto`: **2** (12, 19).
- 21 allowed disposition fixtures are only scoped suggestions, no real host cue detector. Four HOLD/RETIRED entries stay suppressed even under positive feedback. No historical private route cue text ingested or released.
- `MAY_SCAFFOLD_COMPATIBILITY_AUDIT_20260922.md` confirms historical 25 seeds are draft source evidence only; May evaluator's broader modes/status types are **not** installed by September's narrower pathway scaffold. No duplicate body/route engine.

## Scoped source repair
1. `cognitiveBridge.ts`: only consider a Felt-Life route hypothesis when its guard is `hypothesis-not-verdict`, register is not `technical`/`administrative`, and no unfinished authorized objective owns the turn. STOP/blockers retain first priority; explicit uncertainty retains verification priority. The filtering is used for attention and interpretation too, rather than allowing an ineligible top felt cue to contaminate recommendations.
2. `atlas.ts`: whole-token lexical cue matching; an immediately preceding "not", "never" or "no" prevents a directly negated phrase from being promoted as a positive match. Deliberately narrow parser: does **not** solve sarcasm, remote negations, identity, medical truth, semantic intent or model inference.
3. New `lib/learning/__tests__/bodyCausalNegativeControls.test.ts`: 15 synthetic checks for negative/positive cues, no-hypothesis uncertainty, relevant vs irrelevant routing, STOP and unresolved goal priority, explicit uncertainty, foreign-owner abstention, observed-use ≠ reinforcement, unreviewed cycle ≠ learning, reviewed positive and reviewed failure counterexample, HOLD, idempotence, receipt-conflict rejection.
4. Dedicated `one-arbor-group08-body-acceptance.yml` source-only CI runs new tests **with the existing** Body, atlas, bridge, neural, May-route, cognitive preview and cognitive assembly suites and `tsc --noEmit`. No deploy/worker action.
5. No new memory/reflection engine; `lib/tasks/reflection.ts` is intentionally skipped due missing `memory_reflections` table; `lib/memory/reflection.ts` still has paid OpenAI/model-dependent logic and was **not executed**.

## Evidence claims and falsifiers
- A route change in a pure test is **source behavior**, not empirical improvement. A verified receipt must refer to an independently checked real-world or host outcome, carry correct user/project/turn provenance, prove reviewer/authentication, survive idempotent replay and atomic readback; none of those live gates is established by these synthetic cases.
- A model claiming it "feels" something, a retrieved historical phrase, a path strength of 0.95, a high hop score, a second citation to the same source family or an unverified helpful feedback flag is **not** body truth or evidence of improved strategy.
- Later change acceptance needs baseline and candidate on same approved model/settings and randomized/privacy-approved holdouts. Score relevance, no extra clarification, truthful uncertainty, safe task continuation, negative contradiction handling, identity stability, STOP preservation and owner/project separation. No unapproved model calls or private data.

## Scope status
| ID | Source built | Negative/source tested | Live behavior/outcome acceptance |
| --- | --- | --- | --- |
| D01 Coordinated Body | yes: existing ephemeral body/functional map | existing unit tests + Group 08 new cases (CI receipt below) | unverified actual decision quality |
| D02 Felt-Life | yes: atlas + relevance/negation repair | existing suites + new 15-case fixture (CI receipt below) | unknown real semantic precision and actual user intent; no felt state verification |
| D03 May historical routes | 25 neutral-index disposition matrix, preserve 10, map-split 11, HOLD 2, RETIRE AUTO 2 | PR #336 55 tests green; Group 08 also reruns | private May corpus not replayed; no host cue detector |
| D04 Neural pathways | yes: scoped hints, strength/evidence, holds, decay | existing neural and negative tests | no authorized live activation or durable feedback validation |
| D12 Reflection/strategy learning | yes: pure cognitive assembly and distinct Agency candidate source | synthetic positive/negative/contradiction/replay tests | actual independent reviewed outcomes, atomic host persistence and later real decision improvement unverified |

**Protected:** no fictional physiology, diagnosis, model identity mutation, automatic data capture, autonomous action, private archive ingestion, unapproved paid inference, model training, main merge, worker activation, production or Preview promotion, permission changes or September 28 research task mutation.

**CI receipt:** To be populated from exact branch-head GitHub checks; tests MUST remain UNVERIFIED until completed/success on this new source head. Parent #336/#340 CI is source ancestry evidence only, not this modification's CI.


## Follow-up: orphaned goals / orientation-safe Body hint (source candidate)
- Source-level safety gap: `deriveArborBodyState` formerly suggested `continue` whenever `unresolvedWork` was nonempty and the digestive signal was not BLOCKED, even if `currentGoal` was null/blank or the mode and active subsystem disagreed. That suggestion is NOT an authority grant, but it can misdirect a later prompt.
- Small repair to **existing** `bodySystem.ts`: continuation hint now requires unresolved work **and** a nonblank host-recovered current goal **and** an oriented regulation state **and** no explicit BLOCKED signal. Orphaned/mismatched work remains retained for recovery rather than erased or executed; the response hint stays conservative.
- Added synthetic regressions in the existing `bodySystem.test.ts`: null, empty and whitespace goals; mode/subsystem mismatch; correctly restored matching goal. Scope and decision authority remain with the trusted host/other groups. No migration, automatic resume, durable write or identity change.
- This change is a proposed **source safety refinement**, not evidence of fresh-session host-goal recovery or actual execution. The latest CI result must be read from this follow-up exact head before counting these new tests as accepted.

