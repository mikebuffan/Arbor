# Investigation Discovery Engine — source-only build

Date: 2026-09-30  
Branch: `feature/research-investigation-integrity-layer-20260930`  
Parent integrity layer: PR #218

## Why this exists

The Investigation Integrity Layer is the brake: it prevents narrative promotion, false corroboration, contradiction smoothing and unsupported absence claims.

This discovery layer is the engine: it gives Arbor a bounded way to make its **own** connections and hypotheses without inventing evidence.

The two must stay coupled. Creative research without the integrity layer becomes storytelling. Integrity without discovery becomes a perfectly sourced summary machine.

## Discovery model

The discovery engine consumes trusted observations with:

- evidence ref;
- independent source-lineage key;
- document family;
- time;
- resolved/stable entity refs;
- event tags.

It looks for structure rather than famous names:

1. **Bridge nodes** — one entity appearing across otherwise separate document families/source lineages.
2. **Cross-family recurrence** — repeated entity presence that deserves role reconstruction.
3. **Temporal convergence** — independent records clustering in a narrow date window.
4. **Expected-footprint gaps** — records that should be searched for if a working hypothesis is true; these are never treated as proven absence.
5. **Reverse-path checks** — relationships that should reproduce when research starts independently from the opposite endpoint.

Every output remains `status: hypothesis` with confidence capped below 0.50.

## Creative Arbor hypothesis layer

`investigationHypothesisPlanner.ts` lets the canonical Arbor agency loop synthesize novel mechanism hypotheses from grounded discovery leads.

It is explicitly encouraged to ask questions a normal name-first search might miss, for example:

- What shared mechanism could produce records in several unrelated document families?
- Is a recurring intermediary more informative than the famous principal?
- If the accepted timeline is right, what earlier record should exist?
- Does a relationship survive when reconstructed backward from the other endpoint?
- Could one administrative or logistical role explain several apparently unrelated clusters?

The planner may be creative about **mechanisms and questions**, not facts.

Hard bounds:

- no new named actors;
- no invented evidence/date/conduct/relationship;
- only supplied lead IDs/evidence refs/entity IDs;
- every hypothesis predicts a documentary footprint;
- every hypothesis names evidence that would disconfirm it;
- searches must seek both support and counterevidence;
- hypothesis confidence remains below 0.50;
- hypothesis output is never a finding.

## Self-feeding research loop

Structured research receipt results are now available to the controller planning context.

That permits the intended loop:

```
trusted evidence
  -> structured observations
  -> anomaly discovery
  -> creative hypothesis
  -> predicted documentary footprint
  -> bounded Pattern Hop searches
  -> primary-source/counterevidence/relationship results
  -> new observations
  -> repeat
```

The canonical controller is instructed not to merely replay discovery search seeds. It should synthesize a small, testable next question from the grounded anomaly signals and prefer overlooked bridge nodes/edges over already-saturated famous names.

## Current safety boundary

The discovery unit is optional and registers only when a trusted observation store is supplied.

The current default research host does **not** supply that store, so this source does not activate discovery against live or external investigation material.

Still separate/gated:

- external DOJ/EFTA intake;
- production observation/entity persistence;
- entity identity-resolution acceptance;
- live discovery-store adapter;
- scheduler/unattended operation;
- private/victim-data processing;
- automatic finding promotion/publication.

## Acceptance targets

Synthetic tests require:

- same-lineage copies do not become independent corroboration;
- bridge-node discovery requires independent lineages;
- temporal convergence preserves mundane alternatives;
- expected missing records remain search leads, not absence claims;
- reverse-path tests are generated;
- Pattern Hop seeds explicitly seek counterevidence;
- model hypothesis generation rejects invented evidence/entities;
- model hypothesis confidence cannot cross the finding boundary;
- canonical planner contains anomaly-driven creative planning requirements.
