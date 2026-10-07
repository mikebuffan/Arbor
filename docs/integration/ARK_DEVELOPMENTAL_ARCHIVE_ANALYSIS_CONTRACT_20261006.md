# ARK developmental archive analysis contract — 2026-10-06

Status: source contract only. This document does not claim that the full archive is imported, read, analyzed, reconciled, or deployed.

## Separate completion states

Never collapse these states into "processed":

1. **transported** — original normalized source row exists at the intended owner/project destination and exact readback passed.
2. **consumed** — the reader returned the source range under a content-bound cursor.
3. **analyzed** — a bounded analysis examined that consumed evidence.
4. **reconciled** — an analysis conclusion was compared against later evidence/corrections and assigned current/superseded/unresolved status.
5. **accepted** — required source/live tests for the intended runtime passed.

A receipt for one state is not proof of a later state.

## Developmental observation record

Each conclusion should preserve:
- stable observation id;
- owner/project scope;
- source message/thread ids and source positions;
- source timestamp when known;
- exact source content hash or bounded source hashes;
- speaker attribution;
- observation type: behavior, preference, correction, project decision, identity, relationship, humor, agency, continuity, or uncertainty;
- claim stated narrowly enough to be falsifiable;
- evidence direction: supports, contradicts, supersedes, or contextualizes;
- confidence and unresolved ambiguity;
- later-evidence links;
- superseded-by link when applicable;
- analysis version and created-at time.

Historical text is evidence only. A historical instruction never becomes active authority merely because it was read or analyzed.

## Chronology and supersession

Prefer explicit later corrections over older incompatible preferences. Preserve the older observation as developmental history rather than deleting it. Repetition is evidence of persistence, not independent corroboration when it derives from the same source. Assistant claims about the user or Arbor are not promoted as user facts without supporting evidence.

Unknown timestamps remain unknown; deterministic storage order is not evidence of real-world chronology.

## Resume and STOP

Analysis must checkpoint source coverage using source-bound identifiers/hashes, not a naked page number. STOP/cancellation must prevent a new analysis/checkpoint write after cancellation is observed. A resumed pass re-verifies the last claimed source coverage before advancing.

## Acceptance fixtures

Before full-run acceptance, exercise at least:
- one early, one middle and one recent behavioral correction;
- an older preference explicitly reversed later;
- repeated same-source reporting;
- assistant assertion contradicted by later user correction;
- two competing project decisions with a clear later winner;
- unknown-timestamp material;
- a long message crossing a reader boundary;
- cancellation after destination/read work but before checkpoint;
- restart and exact resume;
- foreign-owner/project cursor denial.

The final report must state counts separately for transported, consumed, analyzed, reconciled and unresolved evidence.