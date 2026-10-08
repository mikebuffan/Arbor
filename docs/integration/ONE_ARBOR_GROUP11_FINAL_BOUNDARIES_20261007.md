# ONE ARBOR — Group 11 resumed safe-source handoff

Date: 2026-10-07. Scope **E01, E02, E03, E04, E06, E07 only**. Source-only review, no new engine, UI, model inference, deployment, canaries or grants.

## Ownership and actual baseline

- Original Group 11 read-only source audit (owner Library): `ONE_ARBOR_GROUP11_SOURCE_AUDIT_HANDOFF_20261007.md`. No repairs were committed there because Vercel source-build exclusion was not authorized through that lane. The unmodified `test/one-arbor-group11-initiative-discovery-20261007` branch is *not* asserted complete or updated here.
- This separate isolated review branch forks PR #340 `595375d525cf561172449726ed0c086ab4ece7db` (not merged/deployed), adds exact branch to existing `ops/grove/source-only-ignore.mjs` *before* source changes, and changes only bounded Group 11 validation and tests.
- Group 09 PR #353 owns `cognitiveDynamics.ts`; Group 10 owns Pattern Hop/FAFO; Group 08 owns causal body routes; Group 01 owns release. None of their source files changed. Do not substitute source tests for hosted behavior.

## Eight synthetic regression tests / bounded fixes

### E07 Decision-history view integrity
- Existing `projectDecisionAncestry` still projects scoped event history, warnings, current choice and **reported** (not independently verified) outcome refs.
- Existing `assertConsistentView` now compares `reportedOutcomeRefs` AND the **entire currentChoice object**, not merely its ID. Forged read-only view fields must not become clean Human Decision Inbox or What Changed inputs.
- Negative controls: forged outcome list, same-ID forged choice with modified summary/evidence, valid read-only views, foreign project and conflicting duplicate event ID.
- Scope unchanged: **no** host source authentication, outcome verification, memory promotion or authority granted. An attacker able to rewrite both raw event and projection remains beyond this purely local validation; actual signed/authoritative source provenance is a trusted-host obligation.

### E03 Discovery Radar visited-ID bounding
- Existing `projectDiscoveryRadar` now requires an array of up to 128 **unique**, nonblank string IDs (each <=200 chars). Invalid/malformed/duplicate or oversized input fails closed before existing Pattern Hop ranking.
- Negative controls: 129 IDs, null/number/blank/oversized/duplicate IDs; exactly 128 valid IDs, unchanged deterministic ranking, visited exclusion, foreign project rejection, source-family dedupe.
- No provider queries, new crawler, tools, cross-project grants, source-content exposure or expanded UI. `retrievalMethod` readout to user remains withheld until privacy/sanitization acceptance.

## Six-task truth table

| ID | Actual completed safe step | Protected unfinished proof |
| --- | --- | --- |
| E01 Failure Radar | Existing read-only decision warnings and adapter retained | Live host event provenance, scoped failure observations and response effect |
| E02 Human Decision Inbox | Existing read-only review projection retained; forged view now rejected | Actual human authorization/approval flow; source projections grant nothing |
| E03 Discovery Radar | Visited-ID bound repaired; scoped negative tests added | Trusted grants, real relevance/source-family inspection, real host use |
| E04 What Changed | Existing read-only diff of event views retained; forged view now rejected | Two durable independently authenticated checkpoints and live delta effects |
| E06 Model-Swap Laboratory | Existing *same-model*, offline A/B harness acknowledged; no engine changed | Separate paid/provider/privacy consent, actual two-model matched blinded outputs |
| E07 Decision-history receipts | Outcome and current-choice projection consistency hardened | External provenance authenticity, actual reviewed outcome and live consequence |

## Accepted result is source-level only

Focused CI is `.github/workflows/one-arbor-group11-source-boundaries.yml`: existing decision/Discovery regressions + new negatives + backend TypeScript. Exact head SHA and run conclusion must be recorded before source acceptance. This does not prove a real model-swap, a decision made differently due to actual evidence, or deployed caller.

Do not change ARK worker/objective-control flags, restart STOP task, merge to main, deploy Preview/production, move aliases, ingest private corpus, spend on inference/training, change permissions or act on September 28 research task. Any integration with other lanes must preserve latest owner files and source-only branch exclusions.
