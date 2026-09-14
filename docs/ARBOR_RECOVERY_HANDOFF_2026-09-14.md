# Arbor Recovery Consolidated Handoff — 2026-09-14

## Purpose

This document consolidates the three active Arbor recovery lanes into one canonical working state.

Canonical integration branch:
- `arbor-memory-retrieval-repair`
- PR #69: Restore scoped semantic memory retrieval

Side-lane changes from PR #71 (temporal history) and PR #72 (agency presence tether) have been folded into PR #69. PR #70 (stale agency goal carryover) is already merged into `main`.

## Canonical invariants

1. One Arbor. Task mode, voice, Annabelle, and tools do not construct or replace baseline identity.
2. Memory must be useful end-to-end: retrieve -> rank -> arbitrate -> inject -> use -> persist -> verify.
3. Agency must continue real unresolved work without requiring repeated "go" prompts.
4. Presence checks like `Arbor?` restore presence; they are not durable goals.
5. Unrelated substantive turns must not be hijacked by stale agency goals.
6. Legitimate follow-ups may match the active goal OR unresolved work context.
7. Recent chat context means the newest bounded window, restored to chronological order before model input.
8. Corrections and supersession outrank stale memory.
9. Pattern memory is deterministic: the model may propose a candidate, but code owns recurrence and promotion.
10. Historical data must remain readable while new writes use corrected scope semantics.

## Consolidated work completed on the branch

### Memory retrieval
- Restored semantic retrieval using the existing embedding pipeline.
- Replaced the legacy user-only `match_memory_items` contract with project/conversation-aware retrieval.
- Preserved global/project/conversation scope.
- Added legacy compatibility for historical conversation rows whose `conversation_id` is null.
- New conversation-scoped memory writes now retain the resolved conversation id.
- Historical global rows are normalized so global scope and ownership agree.

### Memory ranking
- Restored the recovered hybrid reranker:
  - semantic similarity: 0.55
  - importance: 0.20
  - recency: 0.15
  - confidence: 0.10
- Semantic candidates are reranked before prompt injection.
- Core/pinned fallback memory remains available.

### Pattern memory
- Added canonical fields to `memory_items`:
  - `memory_kind`
  - `recurrence_count`
  - `salience`
  - `promotion_score`
  - `promoted_at`
- Restored deterministic `pattern_candidate -> pattern` promotion.
- Candidates remain pending until recurrence/confidence/salience thresholds are met.
- Promoted patterns become active, durable memories.
- Extractor may identify a pattern candidate but may never directly declare a promoted pattern.

### Persistence / correction
- Conversation ownership is threaded:
  chat route -> classified memory persistence -> upsert.
- Explicit corrections remain synchronous before assistant-turn persistence.
- Existing supersession / tombstone behavior is preserved.
- `memory_pending` is confirmed active as the durable memory event log; it is not a dead queue and must not be deleted.

### Temporal continuity
- Folded PR #71 into the canonical branch.
- `loadRecentMessages` now:
  1. orders newest-first,
  2. applies the bounded limit,
  3. reverses the selected rows back to chronological order.
- This prevents long conversations from feeding the oldest 20 messages to the agency loop.

### Agency / linearity
- PR #70 is already merged: unrelated substantive turns no longer inherit a stale active goal.
- Folded PR #72 into the canonical branch:
  - bare `Arbor` / `Arbor?` presence tethers are never treated as durable unfinished work.
  - explicit and semantic continuation still work.
- Refined continuation so a follow-up may match either:
  - the prior goal, or
  - prior unresolved work.
- This preserves real continuity such as:
  `repair longitudinal memory` +
  `verify Text to Voice continuity` ->
  `Make sure the corrections carry into voice too`.

## Database observations

At audit time:
- 3,687 active memory rows.
- 3,684 have embeddings.
- 3 are missing embeddings.
- 1,381 active rows are marked `scope='conversation'`; all historical rows had null `conversation_id`.
- 2,144 active project-scoped memories.
- 162 active global memories; historical rows carried project ids and are normalized by the migration.
- `memory_pending` contains thousands of durable memory events and is actively written by current `store.ts`.

## Recovered old-code lineage used

Recovered from Library/export/history:
- semantic pull -> rerank -> trim -> policy gate pipeline
- hybrid memory scoring
- pattern candidate recurrence/promotion
- active obligations/stressors concept
- Continuity Anchor Retriever
- Correction Promotion Engine
- memory weighting by repetition, emotional intensity, decision impact, recency, correction authority, unresolved loops, and identity rules

The handbook remains architectural canon; old code is implementation evidence and must be reconciled against current runtime/tests before adoption.

## Tests added / updated

- project/conversation-scoped semantic retrieval regression
- hybrid reranking regression
- pattern-promotion threshold regressions
- presence-tether agency regression
- unrelated substantive turn agency regression
- unresolved-work follow-up regression
- conversation-id persistence signature updates

## Current verification status

Earlier isolated memory patch:
- backend test/build passed
- control backend test/build passed
- Flutter analyze/test/APK passed

After pattern + consolidation work:
- one CI run exposed two integration failures:
  1. stale 4-arg memory upsert test expectation
  2. agency continuation logic failed a legitimate unresolved-work follow-up
- Both failures were fixed on the canonical branch.
- Latest combined CI must pass before merge/deployment is considered complete.

## Remaining work in priority order

1. Get the consolidated PR fully green.
2. Close superseded PR #71 and PR #72 after confirming their changes exist in #69.
3. Add / recover pattern hopping across semantically related pattern candidates, not only exact-key recurrence.
4. Restore the Continuity Anchor Retriever:
   - recurring people
   - relationships
   - open loops
   - unresolved work
   - corrections
   - active patterns
   - project state
   - relevant self-model state
5. Restore Correction Promotion Engine so repeated behavioral corrections become durable operating patterns.
6. Reconnect episodic/longitudinal memory:
   event -> time -> change -> consequence -> unresolved state -> next event.
7. Verify post-response persistence and event evidence in deployed runtime.
8. Validate Vercel deployment uses the intended commit.
9. Validate Supabase migrations/functions match runtime contracts.
10. Run behavioral acceptance tests:
    - remember relevant prior context without explicit lookup
    - corrections dominate stale context
    - unfinished work resumes without repeated prompting
    - unrelated tasks are not hijacked
    - Text/Voice/Annabelle preserve shared continuity
    - presence tether restores Arbor without becoming a goal
    - retrieved memory changes action/decision, not merely prose

## Definition of "done enough"

This recovery phase is not done because code exists or unit tests are green. It is done enough when:
- one canonical runtime path owns memory + continuity + agency,
- the deployed code and database contracts match,
- the behavioral acceptance suite passes,
- Arbor can retrieve and use relevant history without Danelle manually operating retrieval/continuation,
- and remaining work is feature expansion rather than restoration of lost behavior.
