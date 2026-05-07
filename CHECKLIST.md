# Arbor — Working Checklist (Repo-Audited / Working Copy, May 7 2026)

> Canon policy for this checklist:
> - **Backend canon:** the current backend repo is implementation truth. Patch existing backend files instead of pasting duplicate standalone code.
> - **Database canon:** `Arbor_SQL_schema.txt` is DB truth for the target model. Do not invent backend columns/tables/RPCs without migration + compatibility notes.
> - **Memory canon:** prefer the newer `memory_items` schema (`key` + `value jsonb` + `tier/scope/status/deleted_at`) and adapt new memory features onto that shape.
> - **Frontend canon:** newest provided frontend code is higher priority than current frontend code. Frontend files may be modified, replaced, deleted, or reorganized as needed after noting the path/change.
> - **Reference policy:** raw/thread/code-intake files are reference material unless explicitly promoted into this checklist.
> - **Deletion policy:** do not delete backend files or paths without explicit approval. Frontend cleanup/deletion is allowed when replacing stale scaffolding or obsolete UI code, but record it in this checklist.
> - **Secret policy:** do not commit `.env*`; exposed keys must be rotated before deployment.


---

## Current Setup Baseline — May 7 2026

- [x] VS Code setup started on new Windows machine
- [x] Flutter SDK found and PATH fixed
- [x] Flutter commands now run from frontend
- [x] Stale default `test/widget_test.dart` deleted after package/root-widget mismatch
- [x] Backend PowerShell execution-policy issue resolved
- [x] Backend `.env.local` copied into `apps/backend/.env.local` so Next can read it
- [x] Backend build switched to `next build --webpack` to avoid Turbopack symlink privilege issue on Windows
- [x] Backend `.next` cache clear fixed build-worker crash
- [ ] Capture final backend `pnpm build` pass output in checklist notes
- [ ] Capture current frontend `flutter analyze` summary after deleting stale widget test
- [ ] Keep backend lint debt separate from build blockers (`no-explicit-any`, unused vars, deprecated warnings are cleanup unless build fails)

## Current Source-of-Truth Override — May 7 2026

- [x] Backend source of truth: existing backend repo files and schema alignment
- [x] Frontend source of truth: newest frontend code package/reference, even when it conflicts with current frontend implementation
- [ ] Before changing backend, inspect current repo file and patch minimal working path
- [ ] Before changing frontend, compare new code to current UI and prefer new code where conflicts exist
- [ ] Maintain this checklist as the working implementation map before starting each phase

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

## Phase 7 — Frontend / Client — New Code Priority

> Frontend rule: use the newest frontend code as higher priority than the current frontend. Modify/delete/update existing frontend files as needed, but keep backend API contracts grounded in the backend source of truth.

### 7.1 Frontend baseline
- [x] Flutter SDK installed and commands working
- [x] Stale default `test/widget_test.dart` deleted
- [ ] Run `flutter pub get` after any frontend file replacement
- [ ] Run `flutter analyze` and separate true errors from deprecation/style warnings
- [ ] Move Flutter SDK out of app repo later if still located under `apps/frontend/flutter`

### 7.2 Frontend replacement/integration policy
- [ ] Compare new frontend code against current `apps/frontend` structure
- [ ] Prefer new frontend code when UI/layout/state-management conflicts with current frontend
- [ ] Delete obsolete frontend files only after identifying their replacement or confirming they are stale scaffolding
- [ ] Preserve assets/config needed by the new frontend code (`pubspec.yaml`, image assets, fonts if licensed, env/config files)
- [ ] Update imports/package names after any app rename

### 7.3 Memory UI / proof surfaces
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

## Immediate Working Order (Recommended, Updated May 7 2026)

1. [ ] Confirm backend build still passes after `.next` clear and `next build --webpack`
2. [ ] Confirm frontend analyze status after deleting stale widget test
3. [ ] Freeze backend canon: inspect current backend files before any patch; do not paste standalone memory-loop files over existing repo architecture
4. [ ] Freeze frontend canon: unpack/compare newest frontend code and treat it as higher priority than current frontend implementation
5. [ ] Fix `/api/chat` identifier/retrieval mismatches
6. [ ] Rewrite retrieval/injection path so it is fully v2-compatible
7. [ ] Add memory event ledger/correction-truth fields to existing `memory_items` only via migration
8. [ ] Patch backend memory store/retrieval/prompt path for correction history, test-data gating, and first-person/Detective/Humor prompt rules
9. [ ] Add `/api/memory/delete` soft-delete route
10. [ ] Replace/update frontend files according to new frontend source priority
11. [ ] Build client memory viewer/editor against canonical backend endpoints
12. [ ] Add acceptance tests for end-to-end memory loop
13. [ ] Only then revisit import-pipeline refinement / dry-run proofing

## Phase 9 — Prompt / Framework Enhancements

### 9.1 Master Prompt Grounding
- [ ] Explicitly require all backend/query suggestions to use `Arbor_SQL_schema.txt` as the absolute DB source of truth
- [ ] Explicitly forbid invented tables, columns, RPCs, or joins in engineering guidance
- [ ] Add reminder that any repo/code suggestion that conflicts with schema truth must be called out before implementation

### 9.2 Memory Pruning / Token Management
- [ ] Add explicit pruning/consolidation policy for User Long-Term Memory to prevent context bloat
- [ ] Define when to compress stale facts into summaries versus keep them as first-class memory rows
- [ ] Add acceptance checks for token-budget discipline in prompt construction

### 9.3 Time-Decay Distress Assessment
- [ ] Add time-decay check to distress/safety/session-state logic so prior crisis state is re-verified after time has passed
- [ ] Define transition rules from prior Level 3/acute distress into next-day check-in mode
- [ ] Ensure time-aware phrasing can reference recency naturally (`yesterday`, `last night`, `it’s been X days`) without falsely assuming ongoing crisis

### 9.4 Migration Path Discipline
- [ ] Require every schema-affecting code suggestion to include migration SQL
- [ ] Require backward-compatibility explanation for each proposed schema change
- [ ] Require rollback strategy for each proposed schema change

## Phase 10 — Product / Architecture Enhancements

### 10.1 Memory Visualization (UX/UI)
- [ ] Design and implement Memory Vault / Identity Map UI so users can see what Arbor knows
- [ ] Group displayed memory by identity / preferences / ongoing / sensitive / timeline where appropriate
- [ ] Add edit/correct/delete affordances tied to canonical memory APIs
- [ ] Add explicit trust/privacy copy explaining user-scoped memory isolation

### 10.2 Memory Candidate Confirmation
- [ ] Verify `ar_memory_candidates` schema/path exists or identify the canonical candidate table if named differently
- [ ] Add candidate-confirmation flow so Arbor can occasionally verify important uncertain memories with the user
- [ ] Define promotion rules from candidate → confirmed memory to reduce memory pollution
- [ ] Add UI/API support for confirm / deny / snooze on candidate memories

### 10.3 Telemetry-Driven Personalization
- [ ] Audit `buildTelemetry()` outputs and identify what therapeutic/posture signals are already captured
- [ ] Add measurable “reframing success” signals for different guidance styles (e.g. validating / challenge / CBT / ACT / IFS)
- [ ] Define safe adaptation rules so Arbor can shift style based on response patterns without violating posture guardrails
- [ ] Add reporting/debug surface for posture adaptation decisions

### 10.4 Zero-Latency Safety Overrides
- [ ] Add frontend hard-coded Level 3 imminent-risk safety override UI
- [ ] Ensure crisis resources can render immediately without waiting for model output
- [ ] Define backend/frontend contract for safety level signals used by the override
- [ ] Add tests for model-failure/refusal cases so emergency UI still appears

## Phase 11 — Strategic Product Features

### 11.1 Proactive Continuity
- [ ] Use episode summaries + inactivity window to generate proactive check-in prompts after 24–48h inactivity
- [ ] Define opt-in/opt-out controls for proactive continuity notifications
- [ ] Add guardrails so notifications are supportive and not intrusive during recent distress states
- [ ] Connect notification text generation to canonical episode/memory summaries rather than raw logs

### 11.2 Privacy-First Memory Isolation
- [ ] Create explicit technical documentation linking Supabase Auth user isolation to memory retrieval/injection boundaries
- [ ] Add acceptance tests proving no cross-user memory leakage in retrieval, prompt injection, and admin tooling
- [ ] Surface privacy/isolation guarantees in product copy and onboarding where appropriate
- [ ] Ensure any future analytics/telemetry path is clearly separated from user memory content used for personalization



---

## Phase 12 — New RAW / `arbor_code_new` Intake (March 17 2026)

> Status policy for this section:
> - These are **candidate additions from `arbor_code_new.txt` / newest RAW reference**, not yet canon until implemented and verified.
> - Prefer integration into the existing Next.js + Supabase Arbor app instead of copying standalone Python scaffolds directly.
> - Reject or reshape any proposal that conflicts with the current repo, schema, or consent model.

### 9.1 Firefly Prompt Journey / Reflection Framework
- [ ] Evaluate adopting `FireflyPhase` progression (`DARKNESS` → `NATURE_VS_NURTURE` → `LAYERS` → `CONSEQUENCE_OVER_CHAOS` → `FIREFLY_SHIFT` → `DAILY_PRACTICE`) as an optional guided journaling/reflection mode
- [ ] Decide canonical home for Firefly prompt framework in repo (`lib/firefly/` or `lib/arbor/firefly/`)
- [ ] Add typed models for guided prompts, reflection entries, and per-user phase state
- [ ] Decide storage model for completed prompt IDs + per-phase reflection counts
- [ ] Add repo-safe implementation for:
  - [ ] `getNextPrompt()`
  - [ ] `getNextPhase()`
  - [ ] `recordReflection()`
  - [ ] `calculateFireflyScore()`
- [ ] Decide whether “Firefly score / stage label” is user-visible, dev-only, or deferred
- [ ] Ensure no gamification pressure if phase/stage labels are exposed

### 9.2 Compassion / Insight Layer
- [ ] Add structured compassion message library keyed by emotional state + optional phase
- [ ] Add `InsightNudge` / Firefly-card helper layer for short reflection summaries
- [ ] Ensure compassion/insight snippets are modular prompt inputs, not hardcoded into chat route
- [ ] Add guardrails so insight summaries do not invent meaning beyond user text

### 9.3 Adaptive Persona Controls
- [ ] Design persona config model for user-adjustable sliders:
  - [ ] directness
  - [ ] warmth
  - [ ] humor
  - [ ] challenge
  - [ ] structure
- [ ] Add user rules support:
  - [ ] `avoidTopics`
  - [ ] `neverSay`
  - [ ] `alwaysRemember`
  - [ ] `preferredAddress`
- [ ] Add optional `HumorConfig` (`none`, `light`, `self_deprecating`, `dark_gentle`, `shrek_onion`)
- [ ] Add optional `DepthConfig` (`surface`, `moderate`, `deep`)
- [ ] Implement `buildPersonaInstruction()` / persona prompt module in a canonical place
- [ ] Decide where persona preferences live in DB (`user_profile`, `user_style`, or dedicated table)
- [ ] Add UI/settings surface for persona tuning
- [ ] Enforce safety override: user-selected tone never overrides crisis/safety constraints

### 9.4 Brain / Intent Router
- [ ] Evaluate adding a lightweight Arbor “brain” layer for turn classification before prompt generation
- [ ] Candidate modules from intake:
  - [ ] `lib/arbor/brain/types.ts`
  - [ ] `lib/arbor/brain/constitution.ts`
  - [ ] `lib/arbor/brain/detect.ts`
  - [ ] `lib/arbor/brain/plan.ts`
  - [ ] `lib/arbor/brain/prompt.ts`
  - [ ] `lib/arbor/brain/orchestrator.ts`
- [ ] Map suggested intent taxonomy into repo-compatible categories:
  - [ ] `VENTING`
  - [ ] `MEANING_MAKING`
  - [ ] `SELF_JUDGMENT`
  - [ ] `GUILT_COMPULSION`
  - [ ] `BOUNDARY_DECISION`
  - [ ] `FAMILY_TRAUMA_PROCESSING`
  - [ ] `REQUEST_CODE`
- [ ] Map suggested risk taxonomy into existing safety stack without duplicating crisis logic
- [ ] Decide whether this becomes:
  - [ ] a pre-prompt planning layer
  - [ ] telemetry/debug only
  - [ ] or a replacement for parts of existing orchestration
- [ ] Add tests to ensure “brain” routing never bypasses system safety or memory injection order

### 9.5 Language / Style Adaptation
- [ ] Add canonical language detection helper (`en` / `es`) with server-side enforcement
- [ ] Add Spanish tone module that preserves Arbor voice without “como IA” meta language
- [ ] Add subtle style mirroring rules for English and Spanish
- [ ] Add `downshift` mode trigger for high-distress Spanish/English turns
- [ ] Add optional `patternMode` that is opt-in only
- [ ] Decide whether user style preferences should be stored in a dedicated `user_style` table
- [ ] If `user_style` table is adopted, prepare migration + RLS policy before implementation
- [ ] Add tone tests for English/Spanish mirroring and distress handling

### 9.6 Consent / Legal / Privacy Controls
- [ ] Add explicit first-run consent screen before chat if not already implemented
- [ ] Add acceptance tracking for legal documents / disclaimer versions
- [ ] Add “consent required before memory write” enforcement where intended
- [ ] Add “Export my data” + “Delete all my data” settings flow
- [ ] Verify privacy-first memory policy:
  - [ ] store minimal stable preferences by default
  - [ ] avoid raw emotional dumps as long-term memory
  - [ ] avoid addresses, IDs, medical records unless explicitly requested
- [ ] Add user feedback nudge for tone calibration (“too gentle / too blunt / etc.”)

### 9.7 Real-World Orientation / Dependency Prevention
- [ ] Add explicit “real-world orientation” prompt module
- [ ] Add dependency-safe replacement language layer
- [ ] Ensure Arbor encourages offline action and human support where appropriate
- [ ] Audit copy to avoid exclusivity / emotional dependence phrasing
- [ ] Ensure encouragement remains evidence-based and rare enough to matter

### 9.8 Boredom / Playspace / Regulation Modes
- [ ] Add boredom / playspace module as a distinct safe mode
- [ ] Candidate components:
  - [ ] quick quiz / weird fact / mini challenge prompts
  - [ ] dad jokes / light humor bank
  - [ ] short activity suggestions
  - [ ] bored-mode guardrails and easy exit path
- [ ] Add grounding interruption logic:
  - [ ] detect overload / dissociation / spiraling from recent turns
  - [ ] offer grounding only when appropriate
  - [ ] allow skip / opt-out
- [ ] Add “suggest rest” logic carefully so it feels supportive, not nagging

### 9.9 Challenge Mode / Advanced Reflective Modes
- [ ] Add Challenge Mode design review before implementation
- [ ] Requirements from intake to preserve if adopted:
  - [ ] explicit opt-in
  - [ ] user-controlled exit
  - [ ] one question at a time
  - [ ] de-escalation if distress rises
  - [ ] no shame / accusation / authority posture
- [ ] Decide unlock model, if any, and ensure it does **not** feel coercive or gamified
- [ ] Separate normal challenge/reflection mode from any later premium/specialized modes
- [ ] Defer criminology / report-style modules unless product/legal review approves them

### 9.10 Memory Policy Enhancements from Intake
- [ ] Add formal memory policy layer for importance gating before persistence
- [ ] Preserve time-aware scoring:
  - [ ] `hours_since(...)`
  - [ ] decay-based recency weighting
  - [ ] reranking with similarity + importance + decay
- [ ] Decide where recency/last-accessed logic belongs in current TS repo
- [ ] Add “should store memory” gate before upsert for long-term memory candidates
- [ ] Add thread summarization / compaction threshold policy
- [ ] Ensure new memory-policy layer aligns with current v2 `memory_items` schema, not standalone `arbor_memories` Python table drafts
- [ ] Reconcile any standalone Python memory-manager ideas into TypeScript/Next implementation plan instead of porting blindly

### 9.11 UI / Product Tasks from Intake
- [ ] Add optional guided journaling mode
- [ ] Add “ask me one grounding question” quick action
- [ ] Add clear separation in UI between:
  - [ ] user input
  - [ ] Arbor reflections
  - [ ] direct questions
- [ ] Add optional vibe selection with limited choices (`gentle`, `reflective`, `direct`, `practical`, `light`)
- [ ] Decide whether vibe is per-session, persistent preference, or both
- [ ] Add naming flow on first interaction if still desired

### 9.12 Implementation Review / Cleanup
- [ ] De-duplicate repeated persona/framework fragments from RAW references before coding
- [ ] Reject non-canonical standalone examples that do not fit current stack:
  - [ ] Python console chat demos
  - [ ] duplicate `PersonaConfig` type declarations
  - [ ] alternate standalone Postgres schemas that conflict with `Arbor_SQL_schema.txt`
- [ ] Convert accepted concepts into repo-specific file plan before implementation
- [ ] Update checklist status after each accepted intake item is either implemented, deferred, or rejected

---

## Phase 13 — Current Implementation Session Log

### 12.1 Machine/setup fixes completed
- [x] Flutter PATH fixed
- [x] PowerShell script execution issue bypassed/fixed so `pnpm` can run
- [x] Backend `package.json` build script changed to `next build --webpack` for Windows reliability
- [x] Backend `.env.local` placed under `apps/backend`
- [x] `.next` cache clear fixed backend worker crash
- [x] Default Flutter widget test deleted after stale import/root widget mismatch

### 12.2 Known non-blocking cleanup
- [ ] Backend lint has many `@typescript-eslint/no-explicit-any` errors; do not treat as immediate build blocker unless CI requires lint pass
- [ ] Frontend has many `withOpacity` deprecation warnings; defer unless they become build blockers
- [ ] Next warning: `middleware` convention deprecated in favor of `proxy`; defer until memory/frontend work is stable

### 12.3 Next required inputs before coding
- [ ] Latest backend build output showing pass/fail
- [ ] Latest frontend `flutter analyze` summary after widget test deletion
- [ ] Directory listing for frontend new-code bundle or file list before replacing current frontend
- [ ] Confirmation that current `.env*` files are ignored and not committed

