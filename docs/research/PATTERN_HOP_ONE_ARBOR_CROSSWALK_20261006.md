# Pattern Hop improvement crosswalk — One Arbor integration — 2026-10-06

Base: `integration/one-arbor-current-20261006` @ `3c599ffd655409d8f72116ec857b76dfa646bd50`

This child lane reconciles the Pattern Hop research improvements without modifying the active One Arbor candidate in place.

## 1. Source-family collapsing
Retained existing `documentFamilyReconstruction.ts`.
- deterministic reply / attachment / calendar / trip / invoice-payment / deposition-exhibit links
- no fuzzy source-family merge
- family identity remains traceable to source refs

## 2. Source-independence scoring / grouping
Added `sourceIndependence.ts` from the Evidence Engine torture lane.
- same source family collapses into one group
- explicit derivation collapses into the upstream group
- independence count is labeled `independence_not_truth`
- no software claim of proven editorial independence

## 3. Travel verification
Added `travelVerification.ts`.
- itinerary = planned travel only
- actual movement requires movement/airport/tail/manifest/customs/pilot evidence
- aircraft movement and traveler presence are separate
- conflicting route/timing records remain explicit

## 4. Payment-chain verification
Added `paymentChain.ts`.
- witness report, ATM/cash availability, receipt, ledger, bank transaction, reimbursement, staff/household record remain distinct
- ATM/cash availability never proves payment
- direct payer→payee records can be represented without upgrading unrelated evidence

## 5. Witness cross-checking
Added `witnessCrossCheck.ts`.
- phone / calendar / travel / payment / message / other-witness checks
- independent support/counter families tracked
- original witness-claim provenance retained
- no credibility or guilt verdict

## 6. Timeline collision detection
Retained existing `timelineAnalysis.ts`.
- same-entity incompatible-location checks
- minimum travel-time buffer
- impossible order and event-after-report checks
- conflicts preserve both evidence sets

## 7. Alias/entity gate
Retained the current One Arbor `entityResolution.ts`.
- Unicode-aware alias normalization
- fuzzy scores create candidates only
- unresolved identities cannot target/merge into entities
- correction chain is immutable

## 8. Contradiction propagation
Added `contradictionPropagation.ts`.
- direct contradiction weakens only its claim
- explicit dependency weights propagate weakening downstream
- evidence refs survive propagation
- dependency cycles fail closed

## 9. Failed-lead rerouting
Added `failedLeadRouting.ts` from the Evidence Engine torture lane.
- only failed / contradicted / insufficient leads reroute
- depth and branch limits are enforced
- reroutes require evidence-bound alternate queries

## 10. Why-this-hop prioritization
Retained `leadPrioritizer.ts` and added `domainHopPlanner.ts`.
- prioritizes contradiction density, independent-source potential, unresolved identity, missing connective tissue, information gain, evidence density and cost
- new domain planner converts specific evidence gaps into explicit travel/payment/witness/coverage/original-source/contradiction directives
- no person-level suspicion/guilt scoring

## 11. Coverage tracking
Retained `researchCoverageMap.ts` and added `evidenceCoverageMatrix.ts`.
- broad coverage by family/date/entity/location/record type
- event-level channels: messages / phone / calendar / travel / payment / witness / original document
- checked / partial / unchecked / not-observed states
- event provenance retained in generated next hops

## 12. Original-document preference
Retained original-page provenance/review and added `sourcePreference.ts`.
- original record → authenticated copy → sworn testimony → official summary → secondary → tertiary
- source preference is not truth
- summaries remain usable with provenance while originals are sought

## Pattern Hop connection
The current One Arbor `researchPatternHopBridge.ts` review-packet guardrails are retained.
A new adapter converts domain gap directives into the existing `ResearchPatternHopCandidate` contract:
- `persistenceTarget: arbor_pattern_hop_runs`
- provenance-bound trigger evidence
- bounded depth / hop count
- `executionRequested: false`
- `prepared_not_submitted`

Nothing in this lane activates ingestion, workers, live inference, publication, or production.
