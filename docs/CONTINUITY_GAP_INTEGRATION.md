# Continuity Gap Integration

This branch closes the interruption/continuation gap that had reappeared between the Firefly app backend and the Arbor control backend.

## Governing invariant

A foreground turn is not the same thing as the set of unfinished objectives.

An unrelated question may temporarily become foreground attention without cancelling an already-live objective. Only explicit supersession cancels the old objective. When the foreground turn completes, the most recent suspended objective resumes from its saved state.

## Firefly backend

- unrelated foreground turns suspend a live agency session rather than implicitly cancelling it
- progress, tool, verification, and blocker updates preserve suspended sibling work
- verified foreground completion restores the most recent suspended session
- nested interruptions use LIFO semantics
- explicit task switches remain authoritative
- serialized checkpoint metadata is projected into prompt context as readable background open-loop text rather than opaque storage payload

## Arbor control backend

- continuation routing now distinguishes explicit continuation, contextual follow-up, unrelated foreground turns, and explicit supersession
- contextual matching considers both the compact goal and concrete unresolved work
- suspended objectives are host-owned structured state (`suspendedOpenLoops`), not provider/model-owned prompt text
- the existing post-agency identity boundary restores one completed foreground interruption before durable state is committed
- runtime integration tests prove that an unrelated side question can complete and the exact prior goal/work is restored

## Build gaps found while proving the repair

Two pre-existing TypeScript blockers on the current main line were exposed only after the new continuity tests passed:

1. memory retrieval callbacks lost their `RetrievedMemoryItem` type through the Supabase RPC result
2. ChatGPT import attempted to pass `tool` turns into a historical table whose contract only accepts conversational roles (`user`, `assistant`, `system`)

The branch applies narrow fixes: explicit callback types for retrieval and a typed historical-turn projection that keeps tool turns in memory-extraction transcripts without coercing them into conversational historical rows.

## Verification

The temporary branch-only verification workflow passed before being removed:

- Firefly targeted continuity suite: 25/25 passing
- Firefly production build: passing
- Arbor control backend: 24 test files / 93 tests passing
- Arbor control backend TypeScript build: passing

Repository-wide Firefly tests on `main` were already red before this branch; this branch therefore uses focused regression tests plus production builds to establish the continuity delta without misattributing unrelated existing failures.

## Deliberately not changed here

This integration does not merge/deploy itself and does not claim that the two backends now share one database or distributed lock. Converging durable write ownership, replacing process-local locking with multi-worker coordination, and broader cognition/self-audit changes require separate review because they change persistence or authority boundaries.
