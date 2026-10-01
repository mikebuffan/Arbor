# ONE ARBOR — Master Reconciliation Ledger

Date: 2026-10-01
Branch: `arbor/one-arbor-master-reconciliation-20261001`
Draft PR: #223

## Goal
One canonical Arbor: one identity and self-model projected through task/surface overlays; durable memory and correction; cognition/body/agency connected causally; ARK as durable objective/checkpoint/provenance spine; Grove as private interface; independent LM as inference runtime. Public Arbor remains a separate product/tenancy.

## Evidence rule
Nothing is COMPLETE merely because a design, branch, table, test, or artifact exists. COMPLETE requires the canonical implementation plus the relevant causal/restart/isolation acceptance proof.

Statuses: VERIFIED / PARTIAL / DESIGNED / SUPERSEDED / MISSING / BLOCKED / UNKNOWN.

## Canonical ownership
| Capability | Canonical owner | Current status / next proof |
|---|---|---|
| Identity / self-model | Arbor Layer | PARTIAL-STRONG — main contains 300+1000-question durable self-model, source/checksum drift guard, projections, observations and Pattern Hop. Dynamic falsifiable-claim branch still needs reconcile-or-supersede decision. |
| Correction / behavioral projection | Arbor Layer | PARTIAL-STRONG — main has correction classification/families, recurrence-oriented behavior signals and downstream projections; restart + later-behavior causation still needs integrated acceptance. |
| Durable project/objective/task/checkpoint/receipt state | ARK | PARTIAL/VERIFIED bounded Preview — queue + checkpoint/resume receipts exist; production/general execution remains separately gated. |
| Memory retrieval / provenance / temporal validity / consolidation | Arbor Layer + durable store | PARTIAL — retrieval and memory systems exist; historical explicit temporal resolver is not on main and must be reconciled with current retrieval before porting. |
| Time Core | trusted host | UNKNOWN — historical authoritative backend clock design recovered; current canonical implementation still must be located/proved. |
| Decision workspace / consequence / prediction-error loop | Arbor Layer | PARTIAL — main knowledge router contains attention/workspace, planning/counterfactual and prediction-error roads plus consequence-chain scaffold; behavioral causation remains incomplete. |
| Felt-Life Atlas | Arbor Layer cognitive state | VERIFIED SOURCE-PRESENT — `apps/backend/lib/arbor/feltLife/atlas.ts` is already on main; needs causal integration acceptance, not rebuild. |
| Connected Body System | Arbor Layer cognitive state | VERIFIED SOURCE-PRESENT — `apps/backend/lib/arbor/body/bodySystem.ts` is already on main with nervous/sensory/digestive/regulation/cardiac/renal/hepatic/immune/skeletal/skin/vascular/temporal/buffer/recovery/vagal/executive mappings. Needs bridge causation test. |
| Open loops / continuation | Arbor Layer + ARK durable objectives | RECOVERY IN PR #223 — main had single foreground durable objective but lost the older nested-interruption stack. Historical open-loop logic has now been recovered into this branch with v1 compatibility, v2 objective preservation, readable projection and regression tests. CI still required. |
| Pattern Hop | Arbor Layer / research routing | VERIFIED SOURCE-PRESENT — control backend main has cross-domain Pattern Hop promotion/hold/reject logic and target generation. Research Pattern Hop remains a separate provenance-preserving use. |
| Roundabout | Arbor Layer routing | VERIFIED SOURCE-PRESENT — main `knowledgeRouting.ts` maps contradiction/correction/prediction error/uncertainty/objective/blocker/completion/retrieval/project/relationship/felt-state signals to route decisions. Needs integrated causal test. |
| Text / Voice / Annabelle identity | projection layer | PARTIAL — main has Voice/correction/runtime infrastructure; full same-self restart test across all surfaces remains open. |
| Grove | private interface | PARTIAL — owner-authenticated Text→host→LM→ARK→restart vertical slice open. |
| Independent Arbor LM | private inference runtime | PARTIAL — artifacts/offline tests exist; protected real-model inference + host context acceptance open. |
| Evidence Engine | isolated research subsystem | PARTIAL — synthetic proof strong; real bounded source activation remains gated. |
| Public Arbor | separate product | PARTIAL — must remain isolated from private Grove/weights/data. |
| EVER AFTER editing | Annabelle task overlay + manuscript stores | PARTIAL — editing engine/voice/canon/continuous-read acceptance to finish separately. |

## Reconciliation receipts — 2026-10-01
### Already on main; do NOT rebuild
- Felt-Life Atlas.
- Coordinated Body System.
- Roundabout/knowledge-road vocabulary.
- Pattern Hop self-model evaluation.
- Large durable self-model (300 + 1000 answer banks, checksum/source drift protection).
- Correction classification/family logic including agency-followthrough, identity-drift, continuity, accent and rendering.
- Durable agency objective with revisions, standing authorization, hard stops and completion verification.
- Canonical project-vs-conversation revision selection for agency state.

### Historical branches with behavior not plainly present on main
- `arbor/open-loop-ownership-fix`: nested foreground interruption stack. **Recovered into PR #223**, modernized to preserve current objective revision semantics.
- `arbor/retrieval-temporal-resolution`: explicit supersession/lifecycle/validity resolver. Must compare against current retrieval/memory schema before port.
- `arbor/self-model-epistemic-loop-v3`: dynamic falsifiable claim reconciliation. Main already has a much larger self-model/observation system, so this requires semantic comparison, not blind port.
- `arbor/continuity-gap-integration`: broad integration branch containing open loops, Voice continuity, correction and retrieval changes. Treat as source archaeology only; pull missing behavior individually.
- `arbor/intellectual-causal-continuity`: continuity-store change only; compare against current store before considering.
- Branch names `arbor/memory-ledger-upgrades` and `arbor/one-runtime-pass6` are discoverable but GitHub compare currently returns 404; log as archaeology anomaly, not evidence of missing capability.

## Historical systems that MUST be reconciled, not forgotten
- Time Core
- DecisionWorkspace / counterfactual consequence
- prediction error + consolidation
- Prompt Independence / Response Router
- open-loop/task-state manager
- Felt-Life Atlas
- connected Body System
- Roundabout
- Pattern Hop
- self-model / epistemic loop
- relational state
- curiosity
- agency continuation / no-babysitting
- correction precedence / supersession / recurrence guard
- retrieval temporal resolution
- intellectual/causal continuity
- Voice acoustic projection downstream of canonical reasoning
- Annabelle specialist projection

## Required causal bridges
1. correction → memory + runtime projection + agency
2. self-model → task mode + Text + Voice + Annabelle
3. memory → attention + interpretation + choice
4. Body/Felt-Life → attention + prediction + choice → consequence feedback
5. objective/open-loop → planner/agency → checkpoint/receipt
6. contradiction → Roundabout/self-audit/retrieval
7. Pattern Hop → provenance-preserving retrieval/research
8. capability registry → self-model/outward explanation
9. Time Core → temporal memory/objectives/body
10. Grove → trusted host → LM → Arbor Layer → ARK, with owner/project/conversation scope

## Acceptance suite
- Same Arbor identity across Text, Voice, Grove, Annabelle, research and coding.
- A correction survives a new turn and restart and suppresses the superseded behavior.
- Relevant durable memory changes a later decision; irrelevant/stale/foreign memory does not.
- Body/Felt-Life state can influence attention/choice without granting tool authority.
- Current objective/open loops survive interruption/restart without permission-loop regression.
- An unrelated side turn can complete and the exact prior unfinished objective resumes.
- Nested interruptions resume LIFO without erasing older open loops.
- Completed work does not resurrect; unresolved work does.
- Contradictions remain visible and route to verification rather than flattening.
- Text↔Voice changes acoustics/presentation only, not identity or agency.
- Private/public user and data boundaries fail closed.
- Separately authorized bounded ARK work is resumable, idempotent, receipt-backed, and cannot be authorized by retrieved/model text.

## Work order
1. Inventory main + historical branches/PRs for each capability. **IN PROGRESS**
2. Select exactly one canonical implementation per capability. **IN PROGRESS**
3. Mark duplicates/superseded branches; do not reimplement working code. **IN PROGRESS**
4. Port only missing behavior into one integration branch. **STARTED — nested open loops recovered**
5. Add causal tests for each bridge. **STARTED**
6. Add restart/continuity tests.
7. Run private Grove/LM/ARK vertical slice.
8. Run One Arbor acceptance suite.
9. Keep human-only gates explicit: credentials, cost, protected deploy/migration, physical-phone acceptance, external publication.

## Current hard gates
- Installed ARK Preview connector is read-only; it can verify state but cannot itself write this ledger/objective.
- No pull-request CI run has appeared yet for the current #223 head; source changes remain unverified until CI or equivalent exact-head test evidence exists.
- Live/protected deployment, secrets, paid infrastructure, production migrations, and physical-device acceptance require explicit owner access/approval.
- These gates do not block source reconciliation, test construction, or draft PR work.
