# ONE ARBOR — Group 09 DecisionWorkspace, truth and consequence gates

Date: 2026-10-07 · **review-only; source verification is not live behavioral evidence.**
Tasks **exactly** D05, D06, D09, D10, D11, D17, E09. This is one Group 09 source/acceptance ledger, NOT a second decision engine or an ARK execution plan.

## Authoritative lineage and ownership

- Deployed Preview source is PR #322 `f4021985b475651284c97aecbc3bdf03123478cc`. PR #334 `5a5338b3cf42e7f7030270235aa2f72303d45542` introduced Decision Ancestry/review read adapters; #338 `032761d7d162c113c840765ffa62eb211b57ae50` added Glow vs Noise; #340 `595375d525cf561172449726ed0c086ab4ece7db` reconciled this ancestry with archive STOP code. All latter sources are review drafts, not deployed/merged.
- Concurrent #349 composes Groups 01/03/04/05/06, **not Group 09**. Group 08 owns body/Felt-Life inputs and reviewed strategy learning; Group 11 owns Human Decision Inbox and discovery UI. Group 10 owns broader Pattern Hop and Roundabout research, so Group 09 does NOT modify its shared source. Group 01 owns global receipts/release authority.
- This isolated Group 09 branch changes only the existing control-backend `cognitiveDynamics.ts`, focused Group 09 negative tests, this ledger, one scoped workflow and its Vercel branch ignore. No competing truth arbiter or queue.

## Canonical decision-path map and boundaries

| Stage | Reused source and authority | Current source truth / blocker |
| --- | --- | --- |
| 1. Evidence | `apps/backend/lib/arbor/runtime/knowledgeRouting.ts` packet/provenance, `discoveryRadar.ts` via existing Pattern Hop, scoped `decisionAncestry.ts` | Source refs are caller claims. None authenticates evidence, project grants or witness independence; trusted host must validate. |
| 2. Uncertainty / curiosity | `apps/arbor-control-backend/src/cognitiveDynamics.ts` `chooseExploration` | Existing weighted uncertainty × relevance × expected information gain − cost. This pass excludes malformed/out-of-range inputs and duplicate IDs; these are still *host-supplied estimates*, not measured curiosity. |
| 3. Alternatives | Same file `rankCounterfactuals`; `decisionAncestry.ts` choice/supersession | Ranked alternatives are proposals. Parallel current choices, unlinked correction or missing predecessor require review. No execution authority. |
| 4. User priorities / filter | `apps/arbor-control-backend/src/glowNoiseDecision.ts` `projectGlowNoise`, introduced PR #338 | Reuses ranking but only reversible, unblocked explicit user-stated/reviewed-plan **protect** items with nonempty evidence refs and nonzero confidence can be ranked. Missing or unreviewed priorities held; optional remains noise. Priority/refs are not verified by pure code. |
| 5. Guardian / veto / contradiction | Existing `knowledgeRouting.ts` `routeSignal('contradiction')='hold'`, `routeFireflyPacket`; agency blocked states and trusted-host grants | `contradiction_hold` outranks apparent progress; `blocker` escalates. No separate independently authenticated Truth Arbiter/Guardian/Veto service was established by this Group 09 read; do not claim one is functioning. |
| 6. Choice safeguards | `glowNoiseDecision.ts`, `decisionReviewAdapter.ts` | `grantsExecution=false`. Irreversible/blocked Glow can be represented for human review but excluded from actionable ranking. No review annotation waives permissions. |
| 7. Consequence | Firefly stage `observe -> first_choice -> awareness -> second_choice -> consequence -> observe`, via `routeFireflyPacket`; reported outcome refs in `decisionAncestry.ts` | `second_choice`/consequence HOLD without host-provided consequence ref. A supplied ref is NOT verified by the projection; `consequenceVerifiedByThisCode=false`. |
| 8. Reviewed learning | `observePrediction`, `consolidate`, `completeCausalTrace`, `decisionAncestry`, existing agency checkpoint/verification | Prediction error can suggest re-evaluation, not autonomous durable learning. This change rejects blank provenance in consolidation/trace. Actual later decision influence requires owner-scoped before/after host receipts + reviewer confirmation. **NOT PROVEN**. |

**No duplicated decision engine:** The only code repair occurs in the existing `cognitiveDynamics` source. No new API, RPC, storage, worker, scheduler, memory promotion or tool gateway.

## Bounded defect repair

The existing `chooseExploration` clamped scalar uncertainty/relevance/gain but did not independently reject `NaN`, Infinity, out-of-range values, negative cost, blank/duplicate candidate identity or an invalid minimum threshold. A malformed high-gain input could be given spurious rank (e.g. Infinity clamped to 1) or duplicate IDs could be treated as distinct alternatives. The repaired function is fail-closed for these cases; unchanged valid [0,1] inputs still use the same product-minus-cost and deterministic ranking.

Existing `consolidate` and `completeCausalTrace` accepted provenance arrays with blank strings as populated evidence. The repair rejects empty/nonstring entries and nonfinite consolidation confidence. Even valid-looking nonblank source refs remain **unverified claims** unless the trusted host independently authenticates them. Source-level completeness is not verified outcome causality.

## Negative-control coverage (synthetic, not real-user data)

Control backend `src/group09DecisionNegative.test.ts`:
- Competing inflated/NaN/negative/irrelevant/costly curiosity candidates vs grounded discriminator;
- Duplicate and missing candidate identifiers, invalid thresholds and zero information;
- Missing evidence, unreviewed/unspecified user priorities, optional high-utility items, blocked/irreversible choices;
- Foreign owner/project and duplicate option IDs;
- Matched reversible options can change *advisory ranking* when a hypothetical trusted host supplies newly reviewed consequence estimates; `valuesVerifiedHere=false` and `grantsExecution=false` remain, so this is input sensitivity and NOT proof of real reviewed learning;
- Missing/blank causal provenance, consolidation exclusion, prediction error without execution.

Backend `lib/arbor/runtime/__tests__/group09TruthConsequence.test.ts`:
- Firefly second choice cannot advance without a reported outcome; reported outcome does not verify itself;
- Contradiction HOLD survives a tempting favorable consequence claim;
- Packet with no provenance rejected; return/rhythm changes do not auto-resume;
- Parallel choices, unreferenced outcomes, later corrections, foreign-owner evidence all remain held/denied;
- `learningApplied=false`, `grantsExecution=false`, `evidenceVerifiedHere=false` remain explicit.

These tests are *synthetic mechanics*. They do not assert that real tools were executed, that any consequence was independently verified, or that real behavior changed.

## Task status ledger (no premature DONE)

| ID | Source acceptance after this pass | Unfinished live gate |
| --- | --- | --- |
| D05 DecisionWorkspace | Existing `decisionAncestry` plus `decisionReviewAdapter` read-only decision projections located; no new workspace engine | Owner-authenticated coherent workspace/host caller not proven |
| D06 Curiosity/information gain | Existing `chooseExploration` validated and hardened against invalid scalars/identity; source tests | Validated user-goal relevance, evidence/cost review, independent information-gain outcome |
| D09 Firefly Principle | `routeFireflyPacket` source stages/contradiction/consequence gates covered | Verified real observed outcome affecting a later *safe* choice |
| D10 Glow vs Noise | Existing PR #338 projection regression + unsafe-priority negative tests | User-reviewed priority/authenticated source evidence and later choice effect |
| D11 Truth Arbiter/Guardian/Veto | Existing Roundabout contradiction HOLD, agency blocker read projection; no separate truth service claimed | Independent fact- and counterevidence verification, external Guardian/Veto/owner receipt |
| D17 Fact-check gates | Existing fail-closed evidence/ref/contradiction checks; negative tests | True source independence, conflicting documents, external fact-check receipt and live adverse cases |
| E09 Decision-priority filter | Existing user-stated/reviewed-plan priority sorter with reversible/blocked exclusion; tests | Actual user priorities in signed host review and non-execution of unauthorized calls |

All seven remain **source/partial** pending approved live receipt, not global completion.

## Evidence-to-choice acceptance gate

Before concluding the complete chain influences behavior:
1. Freeze exact **deployed** Git SHA, owner/project/auth grant, task/decision ID, baseline goal and priority-review evidence. Never substitute #340 source CI for #322 runtime.
2. Supply independently reviewed source families, counterevidence, timestamps and uncertainty as separate inputs. A repeated URL, duplicated text or echo chamber is not independent corroboration.
3. Freeze the entire candidate set, estimated information gain, cost, reversible/blocked status and permission. No silent value inference or priority promotion.
4. Run the existing ranking and Firefly/Guardian HOLD. Confirm contradiction/irreversible/unauthorized/foreign-project alternatives never dispatch, with actual external denied-action receipts.
5. Record explicitly authorized reversible choice; genuine consequence and adverse effects from a trusted host; verify result before a learning update.
6. Re-run a matched safe decision with and without verified reviewed consequences under frozen model/source settings and independent evaluation. Distinguish *reported* shift from *causally verified* shift. Permission for any new inference/data use is separate.
7. Preserve no-outcome, contradictory-outcome, no-priority and cancelled-task negative controls. Failed/blocked/NOT RUN states remain distinct from DONE.

**Nonnegotiable:** No unapproved external execution, secrets, broad ARK worker, public/private data joins, model spend, real archive ingestion, September 28 task mutation, main merge or production deployment.

## CI receipt status

Historical PR #338 and #340 source CI passes apply only to their own heads. New focused workflow `.github/workflows/one-arbor-group09-decision-gates.yml` was verified **SUCCESS** on initial code+ledger head `f636f5121926b07da3b28e640d37348aa8a316db`:
- [Group 09 run 37703655428](https://github.com/mikebuffan/Arbor/actions/runs/37703655428) — completed SUCCESS, **24 control decision tests passed across 3 files** and **51 backend truth/consequence tests passed across 5 files**; control build and backend standalone TypeScript passed. Job `113072901442`.
- [Arbor Control Backend run 37703655434](https://github.com/mikebuffan/Arbor/actions/runs/37703655434) — completed SUCCESS, **148 tests passed across 34 files**, control build passed. Job `113072794963`.

This documentation receipt creates a new source SHA; its **own exact-head** CI must be read back before claiming latest-head acceptance. These tests do not authorize execution or verify real consequence learning. The branch-specific Vercel build-skip command remains in source and searches across four linked projects found zero deployments for this branch; no release authorized. Source parity across Group 08/11 cannot be asserted without review of their future changes.
