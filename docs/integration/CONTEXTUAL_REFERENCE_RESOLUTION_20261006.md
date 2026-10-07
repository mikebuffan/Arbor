# Contextual Reference Resolution — Source-Only Workstream

Branch: feature/contextual-reference-resolution-20261006
Base: integration/one-arbor-pre-vercel-20261006
Base SHA: 65be4dc3ac59997d6bb0ee800648293b45932b6e

## Operating boundaries

This lane resolves what a short or referential turn points at. It does not
execute the action, rewrite the user's source wording, mutate continuity or
memory, authenticate identity, or create a second language/normalization engine.

Raw user wording remains authoritative source evidence.

## Complete checklist

- [x] Inspect existing continuity, runtime, agency continuation, subsystem, recent-turn, Voice interruption, correction/supersession, prompt/context, and cognitive-access ownership.
- [x] Define a bounded reference-resolution contract.
- [x] Distinguish literal turns, uniquely resolvable references, context-supported references, ambiguity, unresolved references, and stop/pause/refusal controls.
- [x] Preserve raw wording separately from working interpretation and resolved referent metadata.
- [x] Encode context precedence so newer/current context outranks stale context.
- [x] Handle go / no / wait / stop / cancel / again / prompt? / your turn / what now / same thing.
- [x] Handle first / second / other / that one / this / not that / the one before / go back style references.
- [x] Support correction-after-resolution without rewriting the original turn.
- [x] Protect names, project names, branch names, PR numbers, identifiers, amounts, dates, file names, hashes, and inline commands from silent target substitution.
- [x] Add outcome-relevant ambiguity rules without fake precision.
- [x] Add a bounded resolution receipt with no private reasoning.
- [x] Exercise cross-thread/stale-context, cross-subsystem, Voice interruption, and multiple-workstream traps.
- [x] Verify compatibility with Cognitive-Access Language PR #290 without creating a live pipeline or brittle cross-branch dependency.
- [x] Reuse Capability Hypothesis primitives conceptually without duplicating PR #288.
- [x] Add strong synthetic fixtures and focused tests.
- [x] Run the strongest safe focused checks available.
- [x] Record failures, blockers, live/human gates, exact branch/head, and One Arbor reconciliation recommendation.

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
- Cognitive-Access Language PR #290 is a sibling source-only interpretation lane.
  This branch accepts an optional bounded working interpretation but does not
  import or duplicate PR #290.
- Capability Hypothesis PR #288 defines reusable conceptual primitives. This
  branch aligns to them without a cross-branch code dependency.

## Source contract

The resolver accepts:

- raw text
- optional working text from an upstream accessibility interpretation
- risk level
- candidate referents
- optional protected tokens
- active subsystem

Candidate referents carry:

- stable candidate id
- display label
- referent type
- ranking confidence
- evidence-source categories
- optional aliases / option index / previous selection / repeatability
- optional subsystem and stale flags
- optional protected literals

It returns one of:

- use_literal
- resolved
- clarify
- control

The decision always contains the untouched raw turn and explicitly states:

- mayAuthenticateIdentity: false
- mutatesDurableState: false

## Context precedence

Evidence priority is bounded and explicit:

1. current literal
2. current correction
3. immediate option
4. Voice interruption
5. active objective
6. unresolved step
7. recent user turn
8. recent Arbor turn
9. active subsystem
10. supplied context
11. older continuity

Stale candidates are penalized. A candidate from a different subsystem is also
penalized unless current-turn evidence explicitly revives it.

Numeric candidate confidence remains an internal ranking signal. Receipts expose
only none / low / moderate / high confidence bands.

## Control behavior

Literal control turns are resolved before contextual candidates can interfere.

- no / nope / nah -> refusal
- wait / hold on / no wait / no, wait -> pause
- stop -> stop
- cancel -> cancel

Referential controls are not flattened into blanket controls.

Examples:

- cancel it -> resolve "it"
- stop that one but keep the other -> clarification/structured resolution
- no, the other one -> correction + referent resolution

## Protected literals

Automatic protection includes:

- money amounts
- dates
- PR/issue-style numbers
- H214-style identifiers
- numeric literals
- commit/hash-like strings
- common feature/fix/integration branch paths
- common file names/extensions
- backticked command/code literals

Caller-supplied protection remains available for names, project names, uncommon
branch/file forms, or any literal the caller knows must stay exact.

## Cognitive-Access Language compatibility

Intended conceptual flow:

RAW TURN
-> optional Cognitive-Access working interpretation
-> contextual/reference resolution
-> bounded working intent/referent metadata
-> existing prompt/continuity/agency owners

Hard rule: the working interpretation never replaces the raw turn.

A high-consequence reference that depends on reconstruction or deictic resolution
requires clarification even if one candidate scores highly.

## Capability Hypothesis primitive alignment

- OBSERVE: inspect raw turn + bounded context candidates
- INTERPRET: classify short/reference turn
- PRESERVE PROVENANCE: keep raw wording and evidence-source categories
- COMPARE: rank candidates by context precedence and confidence
- MODEL UNCERTAINTY: clarify materially competing references
- UPDATE STATE: intentionally not owned here
- VERIFY: synthetic tests + focused executable invariants

## Verification

Source-only verification performed in an isolated local harness:

- strict TypeScript compilation: PASS
- focused executable scenarios: 32 PASS
- deterministic invariant assertions: 11,500 PASS

Invariant sweeps verify that:

- literal no/wait/stop/cancel cannot be overridden by active-context candidates
- raw text remains unchanged
- accessibility/reference decisions never authenticate identity
- resolver decisions never claim durable-state mutation authority
- high-consequence deictic references never auto-resolve
- strong current context consistently outranks stale older continuity

Repository test source also contains the full scenario matrix for the branch.
The full repository Vitest/production build is not claimed here unless a remote
CI run reports it.

## Still intentionally not live

This branch does not:

- change the chat route
- change prompt construction
- rewrite persisted user messages
- mutate continuity/runtime/memory/correction state
- change Voice transcription
- authenticate or recognize identity
- merge main
- deploy production
- apply hosted migrations

## Reconciliation recommendation

Reconcile this sibling branch together with Cognitive-Access Language PR #290
into the next One Arbor candidate. Preserve the order:

raw source -> optional accessibility working interpretation -> reference
resolution metadata -> existing canonical owners.

Do not turn either sibling branch into a replacement for raw user text.
