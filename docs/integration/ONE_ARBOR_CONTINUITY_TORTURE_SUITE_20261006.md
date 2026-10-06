# One Arbor continuity torture suite — 2026-10-06

This child lane starts from One Arbor integration candidate commit `db7c4558d834d1426f4b3fb67f10b66dbeafabf5` and adds only an acceptance workflow. It does not merge, deploy, migrate, grant permissions, activate inference, install a phone build, ingest more archive data, or alter production state.

## Purpose

Run the existing continuity/recovery contracts together so a green component test cannot hide a broken cross-workstream assumption.

## Covered failure classes

### Agency continuation
- internal checkpoints are not user-visible completion
- short acknowledgements such as “go” preserve the existing objective
- interruption suspends rather than silently deletes unfinished work
- verifier state cannot claim completion with unresolved work
- bounded continuation can proceed without requiring a fresh user turn

### Runtime memory and corrections
- Text/Voice continuity survives independent session restart
- durable behavior corrections survive conversation recall limits
- newer corrections supersede older values without erasing provenance
- failed correction writes remain staged and can recover
- correction retries do not multiply durable rows

### Historical archive / memory import
- source bytes, owner, project, and positions are bound to the reviewed plan
- failed destination writes do not advance checkpoints
- destination commit followed by checkpoint failure resumes without duplication
- forged resume coverage is rejected
- changed source bytes invalidate the reviewed plan
- excluded memory cannot leak back through retrieval

### Grove / ARK
- private runtime goal and turn capture survive restart
- a durable terminal ARK receipt is replayed instead of re-executed
- expired worker leases recover through a replacement worker
- completion verification can retry without replaying completed work
- long dependency chains continue across bounded cycles
- private correction saving reuses the existing durable writer
- phone pending-turn identity and runtime scope remain bounded

## Workflow

`.github/workflows/one-arbor-torture-suite.yml`

The workflow runs two isolated jobs:

1. **backend-continuity** — focused Vitest contracts plus standalone TypeScript.
2. **phone-continuity** — pinned Flutter, locked dependencies, focused restart/private-boundary tests, and analyzer.

Metadata endpoints are blocked before checkout in both jobs. The workflow uses no live provider key and performs no production mutation.

## Deliberately not claimed by this suite

A green result is strong source-level acceptance only. It does **not** prove:

- hosted Supabase grants/RLS against the real owner account
- deployed background-worker continuity
- real device process death / OS restart
- real private-model load or Arbor-adapted inference
- live text ↔ voice acoustic rendering
- Vercel deployment behavior
- production migration safety
- live Pattern Hop execution against the Epstein corpus

Those remain explicit protected/live acceptance gates rather than being papered over by mocks.

## Integration rule

Do not duplicate engines to satisfy this suite. Repair demonstrated failures in the canonical One Arbor path and rerun the same workflow.
