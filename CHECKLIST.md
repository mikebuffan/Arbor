# Arbor — Working Checklist (Repo-Audited, March 16 2026)

> Canon policy for this checklist:
> - ZIP repo is implementation truth
> - `Arbor_SQL_schema.txt` is DB truth for the target model
> - `RAW_CODE_complete.txt` is reference material only, not canon
> - Prefer the newer `memory_items` schema (`key` + `value jsonb` + `tier/scope/status/deleted_at`)
> - Do not delete old files or paths without explicit approval

---

## Phase 0 — Canon Freeze / Drift Control

### 0.1 Canonical Memory Model
- [x] Canonical `memory_items` target chosen: newer v2 JSON model
- [ ] Remove active runtime dependence on legacy fields in code (`mem_key`, `mem_value`, `display_text`, `trigger_terms`, `reveal_policy`, `strength`, `discarded_at`, `confirmed_at`, `is_locked`)
- [ ] Verify all reads/writes/query filters use only v2 columns unless reading `memory_items_legacy` intentionally
- [ ] Add explicit migration/compat plan before deleting or renaming any legacy code paths

### 0.2 Canonical Retrieval Path
- [ ] Choose one retrieval contract and make all code use it
  - Preferred: `memory_items` + `match_memory_items` RPC
- [ ] Remove parallel retrieval logic from `/api/chat` that bypasses `buildPromptContext`
- [ ] Ensure anchors and memory injection are not duplicated across two separate retrieval systems

---

## Phase 1 — Repo Audit Snapshot

### 1.1 Present in repo (verified)
- [x] `apps/backend/app/api/chat/route.ts`
- [x] `apps/backend/app/api/memory/items/route.ts`
- [x] `apps/backend/app/api/memory/correct/route.ts`
- [x] `apps/backend/app/api/memory/item/[id]/route.ts`
- [x] `apps/backend/lib/auth/requireUser.ts`
- [x] `apps/backend/lib/memory/store.ts`
- [x] `apps/backend/lib/memory/retrieval.ts`
- [x] `apps/backend/lib/prompt/buildPromptContext.ts`
- [x] `apps/backend/lib/memory/anchors.ts`
- [x] `apps/backend/lib/memory/extractor.ts`
- [x] `apps/backend/lib/memory/consolidate.ts`
- [x] Episode helpers exist:
  - [x] `lib/arbor/episodes/getOrCreateOpenEpisode.ts`
  - [x] `lib/arbor/episodes/summarizeEpisode.ts`
  - [x] `lib/arbor/episodes/consolidateEpisodeCandidates.ts`
- [x] Telemetry/proof files exist:
  - [x] `lib/arbor/ProofSnapshot.ts`
  - [x] `lib/arbor/telemetry/buildTelemetry.ts`
  - [x] `lib/arbor/telemetry/types.ts`

### 1.2 Missing or not implemented
- [ ] `/api/memory/delete` soft-delete route
- [ ] User-facing memory viewer UI (frontend/mobile)
- [ ] `lib/arbor/syncRules.ts` (checklist mentioned, repo does not have it)
- [ ] `lib/arbor/stateMachine.ts`
- [ ] `lib/arbor/summarizeEpisode.ts` at top-level path from old checklist (repo uses `lib/arbor/episodes/...` instead)
- [ ] `lib/arbor/consolidateSession.ts` at top-level path from old checklist (repo uses `lib/arbor/episodes/...` instead)
- [ ] `thread_state` table implementation/wiring
- [ ] rhythm injection block implementation

### 1.3 Present but miswired / legacy-drifted
- [ ] `lib/memory/memoryService.ts` still uses legacy columns and should not be on the active path
- [ ] `lib/memory/assembleMemoryBlock.ts` expects legacy `MemoryItemRow` shape
- [ ] `lib/memory/selectForPrompt.ts` expects legacy reveal-policy fields
- [ ] `lib/tasks/decay.ts` reads/writes legacy `strength`
- [ ] `lib/tasks/reflection.ts` reads legacy `mem_key`
- [ ] `lib/system/loop.ts` queries `users` table directly and assumes outdated task wiring
- [ ] `app/api/memory/correction/route.ts` returns a service object instead of applying a correction

---

## Phase 2 — Memory Loop (Critical Path)

## 2.1 Extract
- [x] `extractMemoryFromText()` exists
- [ ] Tighten prompt/schema so extracted items map cleanly to v2 `memory_items`
- [ ] Verify extractor never emits fields that downstream store ignores or misinterprets
- [ ] Add tests for correction-language / contradiction-language extraction

## 2.2 Consolidate
- [x] `consolidateMemoryItems()` exists
- [ ] Verify consolidation preserves `scope`, `tier`, `confidence`, `importance`, and evidence correctly
- [ ] Verify import pipeline uses consolidation before writes everywhere intended

## 2.3 Store
- [x] `upsertMemoryItems()` exists and writes v2 columns
- [x] `correctMemoryItem()` exists and writes v2 columns
- [ ] Fix uniqueness behavior in store layer so upserts are keyed by scope-safe identity
  - candidate: `(user_id, project_id, conversation_id, key)` or explicit canonical rule
- [ ] Stop `findExisting()` from matching only `(user_id, key)` if scope/project separation matters
- [ ] Fix `reinforceMemoryUse()` input mismatch in chat route (currently IDs are passed, function expects keys)
- [ ] Fix `updateMemoryStrength(convoId, 0.2)` misuse in chat route (conversation ID is not memory ID)

## 2.4 Retrieve
- [x] `buildPromptContext()` calls `getMemoryContext()`
- [ ] Standardize on one RPC name
  - current mismatch: `match_memory_items` in retrieval vs `match_memories` in chat route
- [ ] Standardize one touch/reinforcement strategy
  - current extra path: `/api/chat` calls `touch_memories` RPC directly
- [ ] Ensure retrieval respects user scope + optional project scope consistently
- [ ] Gate sensitive memory injection intentionally instead of relying on legacy reveal-policy logic

## 2.5 Inject
- [x] Prompt builder exists
- [ ] Remove legacy `assembleMemoryBlock()` / `selectForPrompt()` dependency or rewrite them for v2 rows
- [ ] Decide canonical injection order and enforce it in one place only
  1. identity/system lock
  2. anchors
  3. rhythm block (when implemented)
  4. retrieved memory items
  5. safety addendum
- [ ] Ensure `/api/chat` does not double-inject long-term memory outside `buildPromptContext`

## 2.6 Respond + Post-write
- [x] Chat route persists user + assistant messages
- [x] Background extraction/upsert hook exists after assistant response
- [ ] Fix post-response reinforcement/write calls to use correct identifiers
- [ ] Ensure anchor promotion and memory writes are idempotent enough under retries

---

## Phase 3 — Schema / RPC Alignment

### 3.1 Database truth already present in `Arbor_SQL_schema.txt`
- [x] `memory_items` v2 table exists in schema
- [x] `memory_items_legacy` table exists in schema for compatibility/reference
- [x] `episodes` table exists in schema
- [x] `trace_logs` table exists in schema
- [x] `system_rules` table exists in schema
- [x] `topic_stats` table exists in schema
- [x] `safety_state` table exists in schema
- [x] `user_profile` table exists in schema

### 3.2 Still needs repo↔schema verification
- [ ] Verify `match_memory_items` SQL function exists in the live DB and returns columns the repo expects
- [ ] Verify whether `match_memories` exists at all; remove or replace if obsolete
- [ ] Verify `touch_memories` exists; if not, replace with store-layer reinforcement logic
- [ ] Verify `memory_reflections` table exists in live DB before using reflection insert path
- [ ] Verify `job_queue` and `system_locks` exist in live DB before using queue/heartbeat paths

### 3.3 Migration tasks to prepare (not apply blindly)
- [ ] Draft migration to add any missing v2 indexes/constraints for `memory_items`
- [ ] Draft migration to support canonical retrieval RPC output shape
- [ ] Draft migration to retire legacy runtime dependencies safely

---

## Phase 4 — API Surface

### 4.1 Memory APIs
- [x] `/api/memory/items` GET/POST exists
- [x] `/api/memory/correct` POST exists
- [x] `/api/memory/item/[id]` route exists
- [ ] Add `/api/memory/delete` POST soft-delete route
- [ ] Decide whether `/api/memory/items` remains canonical list/create endpoint or whether a `/api/memory/list` alias is needed for client compatibility
- [ ] Remove or fix `/api/memory/correction` duplicate route

### 4.2 Episode/Admin APIs
- [x] `/api/admin/summarize-episode` exists
- [x] `/api/admin/consolidate-episode` exists
- [x] `/api/admin/memory/decay` exists
- [ ] Verify admin routes match current auth/admin policy
- [ ] Verify episode summarization/consolidation output is persisted to schema fields actually present

---

## Phase 5 — Reflection / Decay / Jobs

### 5.1 Reflection
- [x] Reflection module exists
- [ ] Rewire reflection job to use v2 columns (`key`) not legacy `mem_key`
- [ ] Verify reflection output table exists and is intended canon
- [ ] Decide whether reflection writes summaries only or can propose/promote new memories

### 5.2 Decay
- [ ] Rewrite decay to operate on v2 fields (likely confidence/importance/mention_count recency), not `strength`
- [ ] Define tombstone vs exclude vs soft-delete policy for decayed memories

### 5.3 Queue / heartbeat
- [x] Queue helper exists
- [ ] Verify queue table/schema alignment
- [ ] Verify worker status enum alignment (`queued/running/completed/failed` vs DB truth)
- [ ] Rewrite heartbeat loop away from non-canonical assumptions (`users` table scan, legacy tasks)

---

## Phase 6 — Anchors / Identity

- [x] Anchor retrieval and set helpers exist in `lib/memory/anchors.ts`
- [x] Prompt invalidation hook exists
- [x] `promoteIdentityAnchors()` exists
- [ ] Confirm canonical anchor storage approach: still `memory_items` scoped as project/core, not a separate `anchors` table
- [ ] Add tests for negative preference anchors (some already exist; extend coverage)
- [ ] Ensure promoted anchor-like memories do not also keep injecting as ordinary memory duplicates

---

## Phase 7 — Frontend / Client

- [ ] Build memory viewer/editor on frontend/mobile
- [ ] Hook to actual repo endpoints (`/api/memory/items`, `/api/memory/correct`, `/api/memory/delete` once added)
- [ ] Add optimistic/busy/error states
- [ ] Verify client sends `projectId` / `conversationId` correctly into chat
- [ ] Add dev-only proof snapshot surface for beta testing memory correctness

---

## Phase 8 — Acceptance / Proof

### 8.1 End-to-end proof tests
- [ ] Extract → store writes new v2 memory row
- [ ] Correction increments `correction_count` and locks after threshold
- [ ] Retrieval returns only current user’s memory rows
- [ ] Project-scoped memory does not leak across projects
- [ ] Sensitive memory remains gated
- [ ] Anchors inject before general memory
- [ ] Chat route does not crash when retrieval RPC is unavailable
- [ ] Import pipeline consolidates duplicates before write

### 8.2 Cleanup candidates (do not delete without approval)
- [ ] `lib/memory/memoryService.ts`
- [ ] `lib/memory/assembleMemoryBlock.ts`
- [ ] `lib/memory/selectForPrompt.ts`
- [ ] `app/api/memory/correction/route.ts`
- [ ] legacy task logic in `lib/tasks/decay.ts`, `lib/tasks/reflection.ts`, `lib/system/loop.ts`

---

## Immediate Working Order (Recommended)

1. [ ] Fix `/api/chat` identifier/retrieval mismatches
2. [ ] Rewrite retrieval/injection path so it is fully v2-compatible
3. [ ] Rewrite legacy task files (`decay`, `reflection`, `loop`) against v2 schema
4. [ ] Add `/api/memory/delete`
5. [ ] Build client memory viewer/editor
6. [ ] Add acceptance tests for end-to-end memory loop
7. [ ] Only then revisit import-pipeline refinement / dry-run proofing

