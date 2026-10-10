# Execution batch 12: decision, truth and consequence gates

Parent draft PR #395 at `fc01e257c137c2d2ae86dd3bb3ef38ca833c3608`, tree `80c9a09da822c14d53a0905de2783c0d646087ce`. Preserve independent PR #388/current parents. Source-only; no merge or deployment.

## Actual repairs

1. Existing counterfactual ranking admitted NaN and positive/negative Infinity utility/confidence. These unsupported choices could remain in the decision list, and infinite scores could outrank a finite grounded option. Exclude nonfinite scores before sorting. Preserve valid score/clamping/reversibility behavior and blocked exclusion. Actual updateCognitiveRuntime tests verify fresh input and restored state. The prior-state path had copied its saved list without rechecking even blocked entries; rerank it through the same existing helper. No action permission granted by a rank.
2. Glow priority evidence validation used Array.some, which skips sparse slots. A nonempty hole-only array, or a source plus a hole, could qualify as supplied evidence and enter reversible Glow ranking. Materialize slots before validation so missing references reject through the existing error path. Valid sourced priorities still rank; blocked/irreversible priorities stay outside eligible Glow ranking.

Six malformed-score cases, two correctly constructed sparse-evidence cases and restored-state regression failed before their repairs; fresh runtime and existing valid-input checks pass. During test setup, the initial sparse-array parameterization accidentally tested missing/string arguments rather than holes; corrected it before using the failing defect evidence. Control build initially caught an overly narrow callback annotation; corrected to inferred unknown validation and build passed.

## Seven task outcomes

| ID | Actually executed/inspected | Remaining acceptance |
| --- | --- | --- |
| D05 DecisionWorkspace | Existing control runtime/counterfactual path traced; finite fresh/restored ranking repaired and integration tested. Existing review/ancestry adapters checked. | Authenticated hosted choice and actual result; ranking does not authorize execution. |
| D06 curiosity/information gain | Existing chooseExploration negative controls pass for nonfinite scores, duplicate/blank IDs, irrelevant/costly/zero-gain candidates. | Genuine information gain and actual later-choice benefit. |
| D09 Firefly Principle | Existing packet source/score validation, contradiction HOLD, consequence-ref requirement and return-reobservation pass. Opt-in Grove cognitive read/preview caller traced, remains read-only. | Caller refs are not verified outcomes; hosted real consequence/review. |
| D10 Glow vs Noise | Sparse evidence repaired; priority source, undefined/unreviewed/missing source, owner scope and reversible/blocked guards checked. | Pure helper has no established production caller; authenticated user priority and real benefit. No new wiring. |
| D11 Truth Arbiter/Guardian/Veto | Existing contradiction HOLD and agency protected blockers verified, without claiming a separate independently authenticated truth service. | Independent fact/counterevidence verification and live denial receipts. |
| D17 fact-check gates | Existing bounded provenance, sparse ref rejection, foreign scope, unsourced outcomes and counterevidence negative tests pass. Actual chat also has safety postcheck, distinct from independent fact verification. | Source authenticity/independence, real conflicting evidence and live fact-check result. |
| E09 decision-priority filter | Existing Glow user-stated/reviewed-plan rules and blocked/irreversible exclusion retained; evidence qualification repaired. | Hosted authenticated priorities and actual non-dispatch of unauthorized choices. No new executor. |

## Verification

- Local full control source: 175 passed across 37 suites; control build passed. Counts overlap earlier/focused regression runs.
- Local backend: 111 passed across eight suites (truth/consequence routing, review/ancestry, provider completion, yield policy, cognitive roundabout and actual Grove caller). Backend TypeScript passed.
- Synthetic fixtures/provider placeholders; backend test setup denies networking. No live provider, database, model or fact-check call.
- Source pins and six deployment fences verified before publication; exact-head remote CI recorded in PR/assessment after completion.

Result: two decision-ranking/evidence repairs, including restored-state protection. Group 12 remains PARTIAL for hosted/model/independent evidence acceptance. Preserve existing cognitive/roundabout/safety paths; no new Truth Arbiter/engine/caller, automatic learning, paid provider, live settings/schema/grants change, deployment or main merge.
