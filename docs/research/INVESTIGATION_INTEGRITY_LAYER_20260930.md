# Investigation Integrity Layer — source-only build

Date: 2026-09-30  
Branch: `feature/research-investigation-integrity-layer-20260930`  
Parent: PR #212  
Child: PR #218

## Purpose

Prevent Arbor/ARK from turning a coherent narrative into a stronger evidentiary claim than the underlying records support.

This layer exists specifically to stop errors such as:

- attributed statement -> "direct confession";
- counsel's procedural litigation position -> defendant's personal admission;
- repeated reporting from one source lineage -> independent corroboration;
- not found in searched scope -> proven absence;
- plausible explanation -> resolved contradiction;
- current best hypothesis -> finding without an attempted falsification pass.

## Source-only implementation

`apps/backend/lib/research/investigationIntegrity.ts` provides:

- explicit evidence classes;
- explicit assertion kinds;
- source-lineage identity;
- primary-source lead generation for secondary evidence;
- unresolved-contradiction HOLD;
- counterevidence cannot disappear silently: each counterevidence reference must be carried through an explicit survived falsification attempt before promotion;
- falsification requirement for established-act, relationship and inference findings;
- scoped negative-evidence states;
- fail-closed promotion decisions.

The layer intentionally does **not** accept free-form model text as trusted evidence authority. Promotion evidence atoms are content-hash bound, and a planner may submit only a persisted claim ID to the optional integrity-gate unit.

## Pattern Hop integration

Pattern Hop now includes these additional branches:

- `primary_sources`
- `source_lineage`
- `falsification`
- `relationships`

The canonical Arbor background-research planner is instructed to preserve evidence class during synthesis, retrieve underlying primary objects for load-bearing secondary claims, attempt to break hypotheses, preserve unresolved contradictions, and keep negative-evidence language scoped.

## Regression fixtures

`investigationIntegrity.test.ts` locks the two concrete narrative-promotion failures that motivated this build:

1. A witness/clinician saying "Subject told me ..." cannot become "Subject confessed" without primary/recorded support.
2. A defense filing offering a stipulation for a procedural purpose cannot become the defendant's personal admission.

Additional tests cover:

- source-lineage deduplication;
- primary-source lead generation;
- unresolved contradictions;
- mandatory falsification;
- scoped absence semantics;
- secondary-only evidence HOLD;
- valid primary-source promotion after gates pass.

`investigationPatternHop.test.ts` locks the new frontier branches and clue behavior.

## Current boundary

This PR is **not** a live investigation authorization.

Still blocked/separate:

- external EFTA/DOJ source intake;
- production evidence persistence integration;
- live worker registration;
- scheduler/unattended operation;
- private/victim-data processing;
- finding publication;
- treating model-planned payloads as evidence.

A source-only trusted-store boundary now requires the **entire finding context**—claim text/type, hash-bound support evidence, counterevidence, current contradiction state, falsification receipts and negative-evidence state—to be loaded from persistence under owner/project scope. The planner supplies only a persisted claim ID.

`SupabaseInvestigationIntegrityStore` is a strict source-only adapter for the proposed loader RPC and fails closed on malformed classes, hashes, assertion kinds, contradiction arrays, falsification state or scope mismatch. An optional `research.integrity_gate` unit exists, but the default host does not register it without a trusted finding store.

`PROPOSED_arbor_investigation_integrity_evidence.sql` adds an append-only **proposal** for immutable evidence/claims, support-vs-counter links, contradiction events and falsification attempts plus a service-role-only scoped loader. `85-investigation-integrity-persistence.sql` exercises it only in disposable PostgreSQL, including owner RLS, client denial, immutable-record enforcement, contradiction open→resolved event history, hashes and full-context loading.

No production/external store is wired or applied here.
