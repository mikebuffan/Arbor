# Execution batch 11: existing body and reflection behavior

Parent draft PR #394 at `d4dfbfc7324a0170355fd407bed796554825f086`, tree `6f018411f0083c4313726751d6eff677f92e97d0`. Preserve independent PR #388 and newer source. Source-only; no merge, deployment or live activation.

## Actual repairs

1. Replaying an already-retained strategy returned only retained notes and erased an unrelated pending candidate. Preserve the existing encoded pending observation within the 20-note bound; replay does not increment its count. Serialized state and the actual restored runAgency loop now retain candidate B across a replay of retained A; a later B observation can complete the existing two-observation policy.
2. Self-update retention checked only verificationCount < 2. NaN, Infinity and fractional counts could bypass that check and retain a supposedly improved strategy. Require a nonnegative safe integer before repeated verification qualifies. Invalid counts continue verifying, while identity regression/new failure vetoes still revert first. Valid repeated verification rules remain.

The lost-candidate regression and three invalid-count cases failed before repair. An initial invalid-count test run had a missing test import; after correcting it, all three failed on actual retain versus continue_verifying behavior. Added regression-veto and actual engine recovery checks pass. Repeated candidate observations are not independently authenticated evidence; repairs do not establish true metacognition or improved live model decisions.

## Five task outcomes

| ID | Actually executed/inspected | Remaining acceptance |
| --- | --- | --- |
| D01 coordinated Body System | Actual prompt builder derives body state from current text/continuity; functional-system, pacing/orientation/blocker and cognitive bridge tests pass. Biological names remain functional metaphors without sensations/diagnosis/authority grants. | Actual accepted model behavior and hosted continuity outcome. |
| D02 Felt-Life Atlas | Actual prompt includes bounded lexical hypotheses and uncertainty; atlas integrity, negation/boundary and contamination/technical-task negative controls pass. | Actual helpful interpretation; lexical matches are not the user's declared state. |
| D03 historical body routes | Existing neutral May disposition compatibility matrix and synthetic tests retained. No private historical corpus replay or new cue detector. | Approved actual historical seed behavior and host cue readback. |
| D04 neural pathways | Existing scoped deterministic associations, evidence/replay, HOLD/decay and cognitive host/assembly tests retained. The opt-in private Grove loop already has a reviewed cognitive host read/preview caller; pure pathway update/learning is not an automatically authorized worker. | Live verified outcome, atomic hosted persistence and durable feedback acceptance. No activation or new caller. |
| D12 reflection/strategy learning | Existing agency engine/session candidate retention and chat self-update lifecycle traced. Pending replay and invalid verification count defects repaired. Scheduled runReflectionJob deliberately returns skipped because approved storage is absent; reflectOnMemoryCluster has no established production caller. | Independent reviewed outcomes and later model decision improvement. No reflection table/new store, job activation or new caller. |

## Verification

- 198 distinct local backend checks across 24 suites (197 in first group run plus new actual-engine recovery case). Covers actual prompt construction, Body/Felt-Life, May routing, neural/cognitive host/assembly/negative controls and strategy checks. Additional existing lifecycle/Grove caller checks recorded separately after completion.
- Backend TypeScript no-emit passes. Synthetic fixtures and dummy provider credentials; network denied by backend test setup; no actual provider/database operation.
- Source fingerprints and six deployment fences checked before publishing; exact-head remote CI recorded separately in PR/assessment.

Result: two useful existing strategy-learning repairs; Group 11 remains PARTIAL at hosted/model/historical-corpus acceptance. Existing opt-in caller is preserved; absent production paths are recorded without building replacements. No new engine/caller, automatic ingestion/learning, paid provider, live settings/grants/schema changes, deployment or main merge.
