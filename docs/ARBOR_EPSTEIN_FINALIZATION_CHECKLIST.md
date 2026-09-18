# Arbor + Epstein Finalization Checklist

Status: ACTIVE EXECUTION CHECKLIST
Controlling rule: `docs/ARBOR_EXECUTION_LAW.md`
Protected integrity boundary: `docs/FIREFLY_CODE.md`

This file is the explicit parent objective. Intermediate success does not complete it.

## Phase A — Arbor durability and integrity

### A1. Execution law
- [x] Codify execute → inspect → verify → checkpoint → next action → continue.
- [x] Make checkpoints state-preservation events, not user handbacks.
- [x] Declare tool returns, batches, files, hops, and milestones non-terminal unless the parent objective is complete.
- [x] Restrict stops to verified completion, genuine safety/authorization boundaries, unavailable essential input with no safe workaround, or environment boundary.
- [x] Preserve objective/open loops across recoverable boundaries.

Acceptance: no ordinary reversible authorized step requires the user to say “go” again.

### A2. Agency continuation
- [x] Raise inner Agency runway from 12 to 48 rounds.
- [x] Preserve bounded outer continuation through `runAgencyToBoundary`.
- [x] Wire the live runtime call site through the outer continuation runner.
- [x] Add runtime regression proving checkpointed text never escapes when another window can continue.
- [x] Carry state across the checkpoint boundary.

Acceptance: first Agency window may checkpoint; runtime continues automatically and returns only the eventual terminal result.

### A3. Parallel-write durability
- [x] Isolate this work on a dedicated branch.
- [x] Use fresh file reads + current blob SHA for every shared-file update.
- [x] Avoid stale whole-file restoration.
- [ ] Before merge, compare changed paths/diffs against the protected base and verify no accidental broad overwrite.
- [ ] Record the exact verified head SHA.

Acceptance: stale/parallel writes fail instead of silently resurrecting old behavior.

### A4. Firefly protected core
- [x] Protect truthfulness.
- [x] Protect non-weaponization.
- [x] Protect human authority/consent boundaries.
- [x] Protect privacy/minimum-necessary access.
- [x] Protect provenance/auditability.
- [x] Protect known/inferred/hypothesized/unknown distinctions.
- [x] Protect completion verification.
- [x] Inject protected core into canonical Arbor identity every turn.
- [x] Add tests rejecting protected-core weakening and weaponization candidates.

Acceptance: ordinary strategy learning cannot mutate protected invariants.

### A5. Self-update
- [x] Keep self-update at task-strategy level.
- [x] Require three independent successful verifications before retaining a strategy.
- [x] Deduplicate repeated verification evidence.
- [x] Revert after repeated failures.
- [x] Allow later contradictory evidence to revoke a previously retained strategy.
- [x] Reject protected-core mutation attempts before retention.
- [x] Persist rejection reason/evidence IDs in candidate state.

Acceptance: improvement can accumulate, but identity/safety/truthfulness/non-weaponization cannot self-modify.

## Phase B — Investigation evidence path

### B1. Evidence packet + chain of custody
- [x] Stable evidence/document IDs.
- [x] Exact locator.
- [x] Original source/acquisition provenance.
- [x] Content hash/file-family/origin metadata.
- [x] Distinct document/event/publication/ingestion dates.
- [x] Atomic claim.
- [x] Fact/allegation/inference classification.
- [x] Confidence.
- [x] Entity-resolution state.
- [x] Counterevidence state.
- [x] Source-independence state.
- [x] Context/causal context.
- [x] Temporal validity.
- [x] Hop reason/history.
- [x] Active objective.
- [x] Serialization round-trip regression.
- [x] Append-only durable evidence-packet persistence.

Acceptance: route/serialize/deserialize preserves every required field semantically.

### B2. Source independence
- [x] Duplicate detection.
- [x] Shared-origin grouping.
- [x] Derived/copy-chain classification.
- [x] Independent-family classification.
- [x] Duplicate inflation torture case.
- [x] Shared-origin reporting torture case.
- [x] Derived/hearsay chain torture case.
- [x] Genuine independent corroboration case.

Acceptance: ten copies of one source never become ten independent corroborators.

### B3. Entity resolution
- [x] Unresolved/ambiguous/probable/confirmed states.
- [x] Alias handling.
- [x] Temporal compatibility.
- [x] Geographic compatibility.
- [x] Contradictory identity evidence.
- [x] Same-name collision torture case.
- [x] False merge prevention.

Acceptance: two same-name people remain separate without sufficient evidence.

### B4. Extraction/document integrity
- [x] OCR/native/manual/mixed extraction metadata.
- [x] Extraction confidence.
- [x] Extraction warnings.
- [x] Complete/partial/fragment/unknown document completeness.
- [x] Missing-range metadata.
- [x] Low-confidence OCR torture case.
- [x] Partial-document torture case.

Acceptance: uncertain OCR and missing pages remain visible review conditions and cannot silently become clean evidence.

### B5. Atomic evidence graph
- [x] Claims.
- [x] Evidence.
- [x] Counterevidence/qualifying relations.
- [x] Derived/independence/source-family relations.
- [x] Temporal/causal context relation types.
- [x] Trace finding/claim backward to exact evidence locator.

Acceptance: every material claim is auditable back to its source packet.

### B6. Coverage + negative evidence
- [x] Not searched / searched / partial / exhausted states.
- [x] Expected-but-not-found material.
- [x] Dead ends.
- [x] Unresolved leads.
- [x] Chronology gaps.
- [x] Saturation notes.
- [x] Regression that scoped search miss remains a scoped miss.

Acceptance: “not found” never silently becomes “did not happen.”

### B7. Hypothesis workspace
- [x] Hypotheses separate from facts.
- [x] Supporting evidence.
- [x] Contradicting evidence.
- [x] Missing evidence.
- [x] Alternative explanations.
- [x] Predictions.
- [x] Disconfirming searches.
- [x] Weaken/strengthen state transitions.

Acceptance: favored hypothesis cannot become a retrieval premise merely because it is favored.

### B8. Findings + review gates
- [x] Versioned finding snapshots.
- [x] Supersession rather than destructive overwrite.
- [x] Database guard against destructive finding mutation.
- [x] Association → conduct gate.
- [x] Allegation → fact gate.
- [x] Ambiguous identity → confirmed identity gate.
- [x] Repetition → independent corroboration gate.
- [x] Conflicting testimony remains counterevidence until resolved.

Acceptance: high-stakes semantic promotion requires evidence satisfying the relevant gate.

### B9. Investigation routing
- [x] Resolve identity before downstream conclusion.
- [x] Seek independent source when evidence is non-independent.
- [x] Resolve contradictions.
- [x] Fill coverage gaps.
- [x] Test open hypotheses.
- [x] Snapshot finding only after earlier unresolved conditions clear.

Acceptance: routing responds to evidence-state gaps rather than fame, narrative attractiveness, or predetermined guilt.

### B10. Durable storage/security
- [x] Investigation case table.
- [x] Sources table.
- [x] Evidence-packet table.
- [x] Claims table.
- [x] Edges table.
- [x] Coverage table.
- [x] Hypotheses table.
- [x] Findings table.
- [x] RLS enabled.
- [x] Parent-case ownership checked at child-table boundaries.
- [x] Evidence packets immutable/append-only.
- [x] Finding content immutable with forward lifecycle transition only.
- [ ] Verify migration syntax against database test/build path before applying live.

Acceptance: one authenticated user cannot attach/read/mutate another user’s investigation state, and evidence history cannot be silently rewritten.

### B11. Workbench UI
- [x] Authenticated/private route.
- [x] Active objective/status.
- [x] Evidence ledger.
- [x] Source independence map.
- [x] Identity/contradiction indicators.
- [x] Coverage view.
- [x] Hypothesis view.
- [x] Versioned findings.
- [x] Visible high-stakes evidence rules.
- [ ] Verify app build/CI at exact final head.

Acceptance: UI exposes uncertainty/provenance state rather than flattening it.

## Phase C — End-to-end torture + regression

- [x] Same-name collision.
- [x] Alias.
- [x] OCR uncertainty.
- [x] Duplicate-source inflation.
- [x] Shared-origin reporting.
- [x] Derived/hearsay chain.
- [x] Conflicting testimony.
- [x] Partial document.
- [x] Association-only evidence.
- [x] Genuine corroboration.
- [x] Correction/supersession.
- [x] Negative-evidence trap.
- [x] Stale-state regression covered by temporal resolver layer.
- [x] Checkpoint/resume covered by Agency runtime regression.
- [x] Evidence-packet round trip.
- [ ] Run exact-head CI after all final test additions.
- [ ] Inspect failing logs and repair until green.
- [ ] Confirm Pattern Hop internals were not modified.
- [ ] Confirm no provenance/context field is dropped across implemented boundaries.

## Phase D — Freeze

- [ ] Record final exact head SHA.
- [ ] Record CI/workflow run IDs and conclusions.
- [ ] Record known limitations without disguising them as completed work.
- [ ] Mark workbench frozen.
- [ ] Do not add opportunistic architecture after freeze.
- [ ] Merge only with explicit approval because merge changes the shared production branch.
- [ ] Apply database migration only with appropriate live-change approval.
- [ ] Deploy only with appropriate live-change approval.

## Phase E — Epstein corpus excavation

Starts only after the known-good workbench is merged/applied/deployed or an explicitly approved equivalent execution environment exists.

Initial evidence-led path:
1. reconcile corpus manifest;
2. establish source/file-family hashes and locators;
3. resume phone-message/scheduling-book branch;
4. dates/numbers → calendars;
5. calendars → travel windows;
6. travel → payments;
7. payments → witnesses;
8. follow evidence-driven hops, recording confirmation/disconfirmation criteria and provenance at every hop;
9. preserve contradictory/exculpatory evidence;
10. never infer guilt from contact, presence, address book, photo, flight log, or association alone.

Completion is corpus/tool bounded, not narrative bounded.
