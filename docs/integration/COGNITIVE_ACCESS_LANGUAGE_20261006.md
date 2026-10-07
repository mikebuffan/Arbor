# Cognitive-Access Language — Source-Only Experiment

This lane tests the accessibility half of "Danelle-ese" without using personal
message history and without performing identity authentication.

## Goal

Help Arbor recover likely intended meaning from noisy or atypical language while
preserving uncertainty and the original wording.

Supported synthetic conditions now include:

- transposed letters
- missing letters / words
- fragmented thoughts
- punctuation disruption
- phonetic spelling
- speech-to-text substitutions / homophones
- word-finding gaps
- abrupt topic transitions
- motor-input mistakes
- fatigue / noisy-input combinations
- multi-error messages
- continuity-dependent short turns such as `go`, `that one`, `no`, and `wait`

## Hard boundaries

- Raw user text is always preserved.
- Reconstructed text is interpretation, not a replacement source record.
- Accessibility interpretation may NEVER authenticate identity.
- Atypical language must never be treated as evidence of lower intelligence.
- Names and project names supplied as protected literals are not silently changed.
- Numbers, money amounts, dates, code-like identifiers, hashes, and issue/PR-style
  number literals are automatically protected from silent substitution.
- Negation may not be silently flipped by a reconstruction.
- Explicit stop/pause controls may not be silently rewritten into continuation.
- High-consequence reconstructed instructions require confirmation.
- Clarification is required only when unresolved ambiguity materially affects the
  answer/action; equivalent wording can share an explicit meaning key.
- This source lane does not profile real user messages.
- No behavioral biometric data is collected.

## Current decision contract

The scaffold produces:

- `use_raw`
- `use_best_interpretation`
- `clarify`

It receives candidate interpretations from a contextual interpreter and applies
conservative selection/ambiguity rules. It deliberately does NOT build a second
autocorrect engine, continuity engine, correction store, transcription pipeline,
or user-specific language model.

Candidate numeric scores are treated only as ranking signals. User-facing/source
receipts expose a coarse confidence band instead of presenting a score as a
calibrated probability.

## Interpretation receipt

The bounded source receipt contains only:

- raw text
- working interpretation
- decision
- confidence band
- alternatives
- whether clarification is required and reason codes
- protected literals
- source type: typed / speech-to-text / unknown
- degradation-signal labels
- `mayAuthenticateIdentity: false`

It intentionally excludes hidden reasoning/rationale.

## Reconciliation with existing One Arbor systems

This branch remains a source-only accessibility component and does not create a
second live path.

- **Conversation continuity:** continuity may supply candidate interpretations
  for short turns such as `go` or `that one`; the cognitive-access layer
  never mutates continuity state and always preserves the literal turn.
- **Correction/supersession:** explicit user correction remains authoritative.
  The cognitive-access layer must not overwrite corrected identifiers or write
  memory/supersession state.
- **Voice transcription:** the existing voice/STT path remains the transcription
  authority. This layer can mark `speech_to_text` as source provenance and
  evaluate candidate recovery without rewriting the transcript record.
- **Behavior projection:** existing behavior rules continue to govern tone,
  correction handling, and continuity. Cognitive-access interpretation is input
  evidence, not identity/personality state.
- **Prompt/context handling:** the current chat route persists the literal
  `userText` before prompt construction and uses that raw text for continuity,
  correction detection, memory signaling, and safety context. A future authorized
  integration must keep that raw path intact and may pass a separate bounded
  working interpretation into prompt construction. It must never replace
  `userText` in persistence or silently feed reconstructed text back into
  correction/supersession state. This branch does not alter `buildPromptContext`
  or live routing.
- **Ambiguity handling:** clarification is emitted only when ambiguity is
  outcome-relevant, high consequence, negation-changing, or control-changing.

## Capability Hypothesis primitive alignment

PR #288 defines reusable primitives:

- OBSERVE
- INTERPRET
- PRESERVE PROVENANCE
- COMPARE
- MODEL UNCERTAINTY
- UPDATE STATE
- VERIFY

This branch aligns to those primitives conceptually:

1. **OBSERVE** raw text/source labels without profiling the user.
2. **INTERPRET** supplied candidates.
3. **PRESERVE PROVENANCE** by retaining raw text and protected literals.
4. **COMPARE** candidate scores/alternatives and literal constraints.
5. **MODEL UNCERTAINTY** with clarification decisions and coarse confidence bands.
6. **UPDATE STATE** is intentionally *not* performed here; continuity/correction
   owners remain authoritative.
7. **VERIFY** through synthetic fixtures and focused tests.

No code dependency on PR #288 is introduced because both branches currently
share the same base and must be reconciled in the next One Arbor candidate
instead of duplicating shared primitives.

## Synthetic coverage

Focused tests cover:

- obvious typo recovery
- multi-typo / multi-error recovery
- wrong-but-plausible substitutions
- context-dependent interpretation
- ambiguous fragments
- speech-to-text substitutions
- named/project literals
- numbers / money / dates
- H214/H216-style identifiers
- negation traps
- dangerous/high-consequence command ambiguity
- correction-after-misinterpretation
- topic switching / word-finding gaps
- short continuity-dependent turns
- stop/pause control preservation
- bounded receipt output
- accessibility/authentication separation

## Still intentionally not live

No live route integration is authorized by this lane.

Do not:

- silently profile user history
- collect behavioral biometrics
- mutate correction or continuity state
- change voice transcription records
- use accessibility evidence for identity authentication
- merge main
- deploy production
- apply hosted migrations
