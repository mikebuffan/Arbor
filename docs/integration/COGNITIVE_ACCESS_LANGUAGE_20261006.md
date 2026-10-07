# Cognitive-Access Language — Source-Only Experiment

This lane tests the accessibility half of "Danelle-ese" without using personal
message history and without performing identity authentication.

## Goal

Help Arbor recover likely intended meaning from noisy or atypical language while
preserving uncertainty and the original wording.

Examples of supported future input conditions:

- transposed letters
- missing letters / words
- fragmented thoughts
- punctuation disruption
- phonetic spelling
- speech-to-text substitutions
- word-finding gaps
- abrupt topic transitions
- motor-input mistakes

## Hard boundaries

- Raw user text is always preserved.
- Reconstructed text is interpretation, not a replacement source record.
- Accessibility interpretation may NEVER authenticate identity.
- Atypical language must never be treated as evidence of lower intelligence.
- Names, identifiers, amounts, codes, and other protected literal tokens are not
  silently changed.
- High-consequence reconstructed instructions require confirmation.
- Multiple plausible interpretations require clarification.
- This source lane does not profile real user messages.
- No behavioral biometric data is collected.

## Current decision contract

The scaffold can produce:

- use_raw
- use_best_interpretation
- clarify

It receives candidate interpretations from a future contextual interpreter and
applies conservative decision rules. This first pass deliberately does NOT build
an autocorrect engine or a user-specific language model.

## Why separate this from Identity Assurance

The same observed language patterns may someday inform:

1. accessibility: "what did the user probably mean?"
2. security: "is this interaction behaviorally consistent with the owner?"

Those are different questions.

Accessibility must not become a covert authentication system, and security must
not treat disability/noisy communication as impersonation.

## Next safe experiment

Run only synthetic and explicitly consented fixtures first. Measure:

- correct intent recovery
- false reconstruction
- unnecessary clarification
- dangerous silent changes
- performance under speech-to-text noise
- performance with protected names/codes

No live route integration is authorized by this lane.
