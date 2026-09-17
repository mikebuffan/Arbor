# Retrieval + Temporal Resolution Contract

Status: isolated integration layer. Pattern Hop internals are intentionally untouched.

## Goal

Make ordinary Arbor recall cheap and current-state correct. Deep archaeology is a fallback, not the default.

## Retrieval order

1. Hot/current state
2. Structured index / archaeology products
3. Pattern Hop
4. Raw archive

Stop escalating as soon as evidence is sufficient.

## Temporal contract

Every state-bearing retrieval should carry:

- assertion time
- validity interval when known
- last verification time when known
- lifecycle status: active / done / blocked / superseded / historical
- explicit supersession lineage
- provenance
- confidence

A retrieved historical fact is not automatically a current fact. Newer is not automatically truer. Explicit lifecycle transitions and supersession are authoritative when they refer to the same state.

## Current-state authority

For project/subsystem state, prefer an explicit current-state record over archaeology. Archaeology answers ancestry/history. Runtime state answers what is true now.

Completion is sticky: a completed subsystem must not be reopened merely because an older source describes it as unfinished. Reopening requires new evidence that explicitly changes the lifecycle state.

## Pattern Hop boundary

Pattern Hop remains responsible for associative multi-hop retrieval with provenance, chronology, confidence and evidence/inference separation. This layer consumes its results; it does not alter Pattern Hop schema, routing, or implementation.

## Regression cases

The acceptance tests include:

- completed Roundabout must beat historical unfinished Roundabout evidence;
- expired day-relative state must not leak across a time boundary;
- old archive/upload state must not be treated as current without current-state evidence;
- raw archive is reached only after hot state, structured index and Pattern Hop fail to provide sufficient evidence.

## Next integration seam

When Pattern Hop is stable, adapt its evidence packets to `TemporalKnowledge` at the bridge boundary. Do not couple this module to Pattern Hop internals.
