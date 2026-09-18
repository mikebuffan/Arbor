# Epstein Workbench — Minimum Remaining Build Plan

This plan follows the completed preflight audit. It is intentionally smaller than the original Phase 0–24 architecture list because existing Arbor infrastructure is reused wherever possible.

## Safety boundary

- No Epstein corpus ingestion yet.
- Do not modify Pattern Hop internals in this lane.
- Do not merge this branch while protected parallel work makes that unsafe.
- New subsystem creation requires a failing acceptance test showing that an existing Arbor component/bridge cannot satisfy the requirement.

## Build 1 — Evidence packet + chain of custody

Acceptance contract:
- stable evidence/document IDs
- original source and acquisition provenance
- exact source locator
- hashes/file-family/origin metadata
- document/event/publication/ingestion dates kept distinct
- atomic supported claim
- fact/allegation/inference classification
- confidence
- entity-resolution state
- contradiction/counterevidence state
- source-independence state
- causal/context information
- temporal validity
- hop reason/history
- active objective

Acceptance test: serialize → route through a boundary → deserialize with all required fields semantically unchanged.

## Build 2 — Source independence + entity resolution

Source gate must distinguish independent evidence from duplicates, near-duplicates, reprints, shared-origin reporting and copy/hearsay chains.

Entity gate must preserve ambiguous identities, aliases, initials and same-name collisions. It must use temporal/geographic/context compatibility and contradictory evidence without forcing a merge.

Acceptance tests: ten copies of one source remain one source family; two same-name people remain separate without sufficient identity evidence.

## Build 3 — Atomic evidence graph

Required node/edge concepts:
- claims
- evidence
- counterevidence
- sources/source families
- entities
- events
- supporting/contradicting/qualifying edges
- corroboration/independence edges
- temporal/context/causal edges

Acceptance test: every material finding can be walked backward to original evidence and exact locator.

## Build 4 — Coverage/gaps/negative evidence + hypotheses

Track searched/not-searched scope, dead ends, expected-but-not-found material, unresolved leads, saturation, chronology gaps and missing document families.

Hypotheses remain separate from facts. Preserve supporting, contradicting and missing evidence, alternative explanations, predictions and disconfirming searches.

Acceptance test: failure to find evidence cannot silently become evidence that an event did not happen; a favored hypothesis cannot become a retrieval premise.

## Build 5 — Findings + review + exports

Finding snapshots are versioned/immutable with later correction/supersession rather than destructive overwrite. Reports preserve provenance, uncertainty, counterevidence and identity state.

High-stakes gates must block automatic transformations of association→conduct, allegation→fact, ambiguous identity→confirmed identity, repeated source→independent corroboration.

Acceptance test: current finding and historical/superseded findings remain distinguishable and auditable.

## Build 6 — End-to-end + torture suite

Exercise complete path from source through export. Include identity collision, alias, OCR error, duplicate-source inflation, shared-origin reporting, conflicting dates/testimony, partial documents, hearsay chains, association-only evidence, genuine corroboration, correction/supersession, negative evidence, stale state, resume/checkpoint and evidence-packet round trip.

Acceptance condition: no provenance/context field disappears; contradictions remain visible; unresolved stays unresolved; current temporal state wins over stale historical state; checkpoint resumes without corpus-wide reread.

## Build 7 — UI

Only after the data path passes. Evidence viewer, entity workspace, timeline, claim graph, contradiction queue, hypotheses, gaps/leads, provenance drill-down and findings/reports.

## Build 8 — Freeze

Run full regression, privacy/security, provenance, temporal, retrieval and Pattern Hop boundary compatibility checks. Record known limitations. Freeze the known-good workbench.

## Build 9 — Corpus excavation

Only after freeze: reconcile manifest, ingest evidence, then evidence-driven Pattern Hop. Every hop records why it occurred, triggering evidence, confirmation/disconfirmation criteria, source independence, identity state, association-vs-conduct status and unresolved uncertainty.