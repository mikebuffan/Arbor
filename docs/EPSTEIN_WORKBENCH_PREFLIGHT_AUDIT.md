# Epstein Investigation Workbench — Preflight Audit

Status: AUDIT COMPLETE / CORPUS INGESTION NOT STARTED

Baseline audited: `main` at `16e304442a1f05bfb0db531f396a121bb656f3c0`.
Protected lane: Pattern Hop internals. This audit does not modify them.
Roundabout current state: COMPLETE.
Retrieval/temporal work remains isolated on this branch / PR #100 until integration is safe.

## Audit rule

Code is not verification. Documentation is not implementation. Historical truth is not current truth. Reuse or bridge existing Arbor machinery before adding a subsystem. Add new architecture only when an acceptance test proves the existing architecture cannot satisfy the requirement.

## Existing Arbor coverage

Repository inventory shows reusable infrastructure for:

- runtime and active-objective persistence
- checkpoint/resume state
- correction and supersession handling
- memory retrieval and rerouting
- Pattern Hop implementation, tests, and persistence migrations
- timeline/event storage
- historical ingestion and recall
- uncertainty handling
- telemetry/privacy tests
- attachment scoping
- authentication/ownership
- import machinery
- audit/proof snapshots

These are reusable foundations, not evidence that the Epstein-specific workbench is complete.

## Master-list audit result

| Area | Status | Audit conclusion |
|---|---|---|
| Governing provenance/uncertainty rules | PARTIAL / reusable Arbor coverage | Core principles exist; Epstein domain contract still required. |
| Corpus intake / chain of custody | MISSING domain layer | Need manifest, hashes, file-family/origin handling, stable document/page locators. |
| Normalization / extraction | PARTIAL | Generic import/attachment machinery exists; evidence-grade page/locator preservation needs acceptance tests/domain layer. |
| Provenance / source families | PARTIAL | Provenance concepts exist; source-family and independence detector remains. |
| Entity resolution | PARTIAL | Generic identity/context machinery is insufficient for evidence-domain alias/same-name gates. |
| Temporal normalization | PARTIAL / isolated improvement | Existing timeline/time work plus PR #100 temporal resolver; not yet integrated/CI verified. |
| Timelines / relationships | PARTIAL / reusable | Timeline storage exists; investigation relationship graph remains. |
| Atomic evidence anchoring | MISSING domain layer | Need atomic claims tied to exact evidence and locators. |
| Evidence Packet Bridge | MISSING domain contract | Must preserve provenance, locator, temporal state, entity state, context, contradictions and hop reason. |
| Claim/evidence/counterevidence graph | MISSING domain layer | Required. |
| Contradiction/friction arbitration | PARTIAL | Roundabout/uncertainty machinery reusable; investigation-specific arbitration and tests remain. |
| Evidence independence | MISSING domain layer | Need shared-origin/copy-chain/independence logic. |
| Identity-resolution gate | MISSING domain gate | Need explicit unresolved/ambiguous identity behavior. |
| Hypothesis workspace | MISSING domain layer | Need hypotheses separated from facts, alternatives, predictions, disconfirming evidence. |
| Pattern Hop | EXISTING / PROTECTED | Audit boundary only; do not change internals in this lane. |
| Investigation routing | PARTIAL | Active-objective/routing foundations exist; evidence-specific routing policy remains. |
| Coverage / gap map / negative evidence | MISSING domain ledger | Required. |
| Immutable finding snapshots | PARTIAL | Audit/proof/supersession foundations exist; evidence finding snapshot contract remains. |
| Checkpoint / resume | EXISTING reusable foundation | Must be acceptance-tested with investigation state. |
| High-stakes review gates | PARTIAL | General safety/privacy foundations exist; allegation/association/evidence-strength gates remain. |
| Finding packets / exports | MISSING domain output | Required. |
| Live investigation UI | MISSING | Build only after data path is proven. |
| Torture suite | MISSING domain suite | Required before corpus excavation. |
| Roads/bridges/roundabouts verification | PARTIAL | Architecture exists; evidence path needs end-to-end tests. |
| Freeze | NOT READY | Only after all required acceptance tests pass. |

## Required evidence path

`source → intake → provenance → stable document/locator → entity extraction/resolution → atomic claim → evidence classification → temporal resolution → contradiction/independence checks → evidence packet → Pattern Hop boundary → investigation routing → finding snapshot → checkpoint → export`

Every handoff must preserve:

- original source and stable document ID
- exact locator
- document/event/publication/ingestion temporal distinctions where relevant
- entity-resolution state
- exact claim supported
- fact/allegation/inference distinction
- confidence and source independence
- contradiction/counterevidence state
- causal/context information
- temporal validity
- hop history/reason

## Pattern Hop interface boundary

Do not alter Pattern Hop internals during parallel work. The future evidence packet must be able to enter Pattern Hop carrying provenance, temporal state, entity confidence, contradiction/counterevidence, hop reason, and active objective. Pattern Hop output must be consumable by the temporal resolver, evidence graph, investigation router, and finding packet layer without stripping those fields.

## Verification status

Repository contains substantial unit/integration/regression test material. No GitHub Actions workflow runs were returned for the audited baseline/head during this audit. Therefore test/code presence is not labeled CI/runtime verified.

## Minimum remaining build list

1. Evidence packet/domain types plus chain-of-custody intake contract.
2. Source-family/independence detector plus entity-resolution gates.
3. Atomic claim/evidence/counterevidence graph.
4. Investigation coverage/gap/negative-evidence ledger plus hypothesis workspace.
5. Immutable finding snapshots, reports/exports, and high-stakes evidence gates.
6. End-to-end evidence-path acceptance tests plus Epstein Torture Suite.
7. Workbench UI only after the underlying path passes.
8. Full regression/verification pass; freeze known-good workbench.
9. Only then begin Epstein corpus ingestion and evidence-driven Pattern Hopping.

## Required torture cases

- same-name identity collision
- aliases and initials
- OCR/extraction error
- duplicate and near-duplicate documents
- many reports derived from one original allegation
- conflicting dates/locations/testimony
- missing/partial documents
- hearsay/copy chains
- association-only evidence
- genuinely independent corroboration
- later correction/supersession
- false-positive identity trap
- negative-evidence trap
- stale-state resurrection
- checkpoint/resume without corpus reread
- evidence packet round trip without provenance loss

## Stop condition

This preflight audit is complete. Do not ingest the Epstein corpus in this lane. Build only the minimum remaining evidence machinery, verify it, freeze it, and then begin corpus excavation.