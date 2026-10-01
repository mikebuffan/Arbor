# Investigation Discovery Wave 2 — predictive and counterfactual research

Date: 2026-09-30  
Branch: `feature/research-investigation-integrity-layer-20260930`  
PR: #218  
Status: source-only; exact-head acceptance pending after this documentation update.

## Goal

Make Arbor harder to fool **and** harder to make boring.

Wave 1 added provenance-preserving integrity plus anomaly-driven hypothesis generation.

Wave 2 adds methods that force hypotheses to make risky predictions, survive independent rediscovery, and compete against a reconstruction that did not receive the accepted narrative first.

## 1. Prediction before search

`investigationPredictionLedger.ts` seals predictions before the follow-up search starts.

A prediction records:

- the hypothesis;
- the already-persisted evidence it came from;
- the documentary footprint expected;
- whether that footprint is required for the hypothesis;
- the timestamp when the prediction was sealed.

`research.prediction` is now a safe default research unit. Its basis evidence must already be present in the persisted session evidence set. The executor timestamp, not model text, seals the receipt.

A missed search becomes `not_found_in_searched_scope`, not a failed prediction unless contrary evidence is actually found or the hypothesis explicitly required something that is contradicted.

The controller is instructed to seal predictions before searching a fresh hypothesis whenever this unit is available.

## 2. Independent rediscovery

`investigationRediscovery.ts` distinguishes:

- one route;
- multiple routes that still inherit the same source lineage/evidence;
- genuinely independent rediscovery from separate starting anchors and lineages.

A relationship is more interesting when it can be recovered from the opposite endpoint without using the known relationship as the search premise.

Rediscovery strengthens a **lead**, not a finding.

## 3. Blind reconstruction

`investigationBlindReconstruction.ts` gives canonical Arbor only raw record envelopes:

- evidence refs;
- source lineage;
- document family;
- chronology;
- resolved entity refs;
- event tags;
- bounded content summaries.

The reconstruction prompt explicitly withholds the accepted public/prosecutorial/defense/media/user narrative.

Every reconstructed event must:

- cite supplied evidence;
- use only supplied entities;
- preserve alternatives;
- state uncertainty;
- remain `reconstruction_hypothesis`.

Only after that reconstruction is complete may it be compared with a structured narrative. Divergence and chronology tension become research leads, not proof that either account is correct.

## 4. Documentary shadows

`investigationDocumentaryShadow.ts` compares an event's paper trail with an evidenced comparison cohort.

It can ask:

- Which normally expected document families are missing?
- Which optional families are absent?
- Which unusual families appear?

A baseline with too few comparison cases or too little preserved evidence is marked insufficient. Missing records always create search questions rather than absence findings.

## 5. Friction accumulation

`investigationFriction.ts` stops isolated anomalies from being forgotten.

Unresolved signals can accumulate across:

- chronology;
- identity;
- ownership;
- source lineage;
- financial;
- procedural;
- relationship;
- documentary shadow;
- testimony.

A cluster requires multiple dimensions **and** multiple independent lineages. Resolved signals stop contributing. Cluster status prioritizes research and explicitly does not imply misconduct.

## 6. Claim genealogy

`investigationClaimGenealogy.ts` traces where a repeated claim actually came from.

Twenty transmissions can still equal one known evidentiary origin.

The analysis refuses to state an independent-origin count if:

- source ancestry is missing;
- provenance is partial/unknown;
- the claimed source chain is circular.

This is the narrative-inheritance detector: popularity is not provenance.

## 7. Counterfactual graph testing

`investigationCounterfactualGraph.ts` removes one node at a time and measures whether the remaining evidence graph fragments.

This makes it possible to detect a structurally important quiet intermediary even when a famous principal dominates attention.

Every edge must carry evidence refs and source lineage.

Structural importance is explicitly not evidence of wrongdoing, authority, knowledge or intent.

## 8. Neutral question mining

`investigationQuestionMiner.ts` turns sourced public questions into a neutral unresolved-question reservoir without inheriting the author's preferred answer.

It preserves:

- source candidate IDs;
- source lineages;
- supplied entity IDs;
- inherited assumptions as a separate field.

It requires:

- primary-source targets;
- disconfirming searches;
- bounded search seeds.

Popularity or repetition does not increase evidentiary weight.

## 9. Cross-entity sequence motifs

`investigationSequenceMotifs.ts` looks for ordered event-tag sequences that recur across multiple resolved entities and independent source lineages.

Example shape:

`scheduled → travel → payment`

A motif is only a hypothesis generator. It explicitly does not establish a shared scheme, intent or misconduct.

Sequence motifs now feed the anomaly discovery layer, which asks whether:

- the same order recurs in more independent entities;
- an ordinary process explains the sequence;
- primary records support each transition;
- reverse searching from the final event reconstructs earlier steps.

## 10. Prediction results feed falsification

A tested prediction can be transformed into an explicit falsification-attempt receipt for the integrity gate.

- required prediction contradicted → failed hypothesis test;
- weaker contradiction → weakened/inconclusive;
- complete non-contradicted test → survived;
- untested prediction → cannot become a falsification receipt.

This prevents the prediction ledger from becoming a decorative side channel.

## Intended research loop

```
primary evidence
  -> identity-safe observations
  -> anomaly discovery
  -> creative hypothesis
  -> SEALED prediction receipt
  -> bounded adversarial search
  -> independent reverse rediscovery
  -> blind reconstruction
  -> narrative comparison
  -> documentary-shadow / friction checks
  -> claim-genealogy check
  -> counterfactual graph test
  -> integrity gate
  -> finding HOLD or promotion
```

At every stage:

- hypothesis != finding;
- association != conduct;
- repetition != corroboration;
- not found != absent;
- structural importance != guilt;
- plausible explanation != resolved contradiction.

## Current boundary

No real Epstein material was ingested by this build.

No merge, deployment, Preview/production migration, live discovery store registration, external-source authorization, unattended scheduler, private/victim-data processing or publication is authorized by this source work.
