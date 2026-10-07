# Contextual Reference Resolution — Source-Only Workstream

Branch: feature/contextual-reference-resolution-20261006
Base: integration/one-arbor-pre-vercel-20261006
Base SHA: 65be4dc3ac59997d6bb0ee800648293b45932b6e

## Operating boundaries

This lane resolves what a short or referential turn points at. It does not execute
the action, rewrite the user's source wording, mutate continuity or memory,
authenticate identity, or create a second language/normalization engine.

Raw user wording remains authoritative source evidence.

## Complete checklist

- [ ] Inspect existing continuity, runtime, agency continuation, subsystem, recent-turn, Voice interruption, correction/supersession, prompt/context, and cognitive-access ownership.
- [ ] Define a bounded reference-resolution contract.
- [ ] Distinguish literal turns, uniquely resolvable references, context-supported references, ambiguity, unresolved references, and stop/pause/refusal controls.
- [ ] Preserve raw wording separately from working interpretation and resolved referent metadata.
- [ ] Encode context precedence so newer/current context outranks stale context.
- [ ] Handle go / no / wait / stop / again / prompt? / your turn / what now / same thing.
- [ ] Handle first / second / other / that one / this / not that / the one before style references.
- [ ] Support correction-after-resolution without rewriting the original turn.
- [ ] Protect names, project names, branch names, PR numbers, identifiers, amounts, dates, file names, hashes, and commands from silent target substitution.
- [ ] Add outcome-relevant ambiguity rules without fake precision.
- [ ] Add a bounded resolution receipt with no private reasoning.
- [ ] Exercise cross-thread, stale-context, cross-subsystem, Voice interruption, and multiple-workstream traps.
- [ ] Verify compatibility with Cognitive-Access Language PR #290 without creating a live pipeline or brittle cross-branch dependency.
- [ ] Reuse Capability Hypothesis primitives conceptually without duplicating PR #288.
- [ ] Add strong synthetic fixtures and focused tests.
- [ ] Run the strongest safe focused checks available.
- [ ] Record failures, blockers, live/human gates, exact branch/head, and One Arbor reconciliation recommendation.

## Inspected ownership

- Conversation continuity already owns current goal, last meaningful user turn,
  last meaningful Arbor turn, unresolved work, active corrections, active
  subsystem, and text/voice channel.
- Runtime session persists the literal last meaningful user turn and carries
  continuity across surfaces.
- Agency continuation already owns whether unfinished authorized work continues
  or returns control to the user.
- Subsystem cues are exact and host-owned.
- Recent-message loading already exists in the chat route.
- Voice already interrupts playback and submits the next final transcript through
  the canonical chat route.
- Correction/supersession remains a separate durable-state owner.
- Cognitive-Access Language PR #290 is a sibling source-only interpretation lane;
  this branch will accept a bounded working interpretation conceptually but will
  not import or duplicate PR #290.

## Intended conceptual flow

RAW TURN
-> optional cognitive-access working interpretation
-> contextual/reference resolution
-> bounded working intent/referent metadata
-> existing prompt/continuity/agency systems

The raw turn remains separately preserved through the entire flow.

No live routing change is authorized by this branch.
