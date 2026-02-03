# Arbor — Working Checklist (Phases 2–3)

> **Source of truth:** Firefly / Arbor Roadmap + Canon Decisions (locked Feb 2026)
> Phase 2 goal: Make memory visible, editable, and self-aware.
> Phase 3 goal: Make memory, safety, and continuity correct, conservative, and provable.

---

## Phase 2 — Memory Transparency & Reflection

### 2.1 UI — Memory Viewer (User-facing)

* [ ] Create UI route/page: `/app/memories/page.tsx` (or mobile equivalent) that:

  * [ ] Fetches memories via `/api/memory/list`
  * [ ] Groups/filters: core / normal / locked / ignored
  * [ ] “Edit” action → calls `/api/memory/correct`
  * [ ] “Delete/Forget” action → calls `/api/memory/delete` (soft delete)
  * [ ] Shows busy/loading + error states

---

### 2.2 API — Memory List

* [ ] Add API route: `/api/memory/list` (GET)

  * [ ] Requires auth (`requireUser`)
  * [ ] Reads from `memory_items` filtered by `user_id`
  * [ ] Ordered by most important / most recent
  * [ ] Returns `{ ok: true, items: [...] }`

---

### 2.3 API — Memory Correct

* [ ] Add API route: `/api/memory/correct` (POST)

  * [ ] Accepts `{ key, newValue }` (+ project scope if used)
  * [ ] Calls memory correction pipeline (store layer)
  * [ ] Returns success + locked status if applicable

---

### 2.4 API — Memory Delete (Soft delete)

* [ ] Add API route: `/api/memory/delete` (POST)

  * [ ] Soft delete flag in DB (do NOT hard delete by default)
  * [ ] Requires auth (`requireUser`)
  * [ ] Returns `{ ok: true }`

---

### 2.5 Reflection Agent (Backend)

* [ ] Verify existing `lib/memory/reflection.ts` is wired to:

  * [ ] Pull recent chat content
  * [ ] Propose memory updates safely
  * [ ] Write updates to `memory_items` via store layer
* [ ] Verify reflection is callable via a job/cron or an internal admin trigger

---

## Repo Audit Notes (Phase 2 readiness)

### Backend: what appears present

* [ ] Memory core modules exist (store / retrieval / reflection / anchors) — verify end-to-end
* [ ] Auth helper exists: `apps/backend/lib/auth/requireUser.ts`

### Backend: what’s missing or miswired

* [ ] Memory List route exists but is not a proper Next API route
* [ ] No `/api/memory/correct` route implemented
* [ ] No `/api/memory/delete` route implemented

### Frontend/mobile: what’s missing

* [ ] Memory Viewer UI not yet implemented

---

## Definition of Done (Phase 2)

* [ ] Signed-in user can view memory items
* [ ] User can correct a memory item
* [ ] User can soft-delete a memory item
* [ ] Reflection can be triggered and safely writes memories

---

## Phase 3 — Canonical Memory, Safety & Continuity

### 3.1 Architectural Locks (Non‑negotiable)

* [ ] Authoritative injection sources: `anchors` + `memory_items`
* [ ] All other systems are instrumentation only
* [ ] One canonical `anchors` table (no `user_anchors`)
* [ ] UUIDs everywhere (user, project, thread, message, memory, anchor)
* [ ] One safety pipeline: heuristic (input only) → `detectRiskSignals()` → `planSafetyResponse()`
* [ ] Clarify‑first rule (exactly one clarification question)
* [ ] Phrase‑count tables deferred (not v1)
* [ ] Prompt injection order locked:

  1. System rules / identity lock
  2. Anchors
  3. Rhythm block
  4. Memory items
  5. Safety plan (if triggered)

---

### 3.2 Database & Migrations (P0)

#### 3.2.1 Memory Reinforcement Loop

* [ ] Create UUID‑based tables:

  * [ ] `ar_topic_segments`
  * [ ] `ar_memory_candidates`
  * [ ] `ar_memory_reinforcement`
  * [ ] `ar_event_log`
* [ ] Do NOT create phrase‑count tables yet
* [ ] Add minimal indexes on `(user_id, thread_id, created_at)`
* [ ] Enable RLS and user‑scoped access

---

#### 3.2.2 Episodes + Topic Stats + Safety State + Trace Logs (47/N)
- [ ] Create enums (idempotent, `DO $$ ... duplicate_object` style):
  - [ ] `episode_status` (`open | closed | summarized | archived`)
  - [ ] `safety_risk_tier` (`none | low | medium | high | critical`)
- [ ] Create tables (UUID-based):
  - [ ] `system_rules` (DB-driven extraction/classification rules)
  - [ ] `episodes` (session/thread consolidation)
  - [ ] `topic_stats` (frequency + recency + time spent)
  - [ ] `safety_state` (persisted escalation tracking)
  - [ ] `trace_logs` (proof snapshot + observability)
- [ ] Add optional FK: `messages.episode_id → episodes.id` (ON DELETE SET NULL)
- [ ] Add indexes:
  - [ ] `system_rules(enabled)` + GIN(`rule_json`)
  - [ ] `episodes(user_id, closed_at desc)`
  - [ ] `topic_stats(user_id, weight desc)` and `topic_stats(last_seen_at desc)`
  - [ ] `trace_logs(created_at desc)`, `trace_logs(retrieval_latency_ms)`, GIN(`proof_snapshot`)
- [ ] Create `view_system_health` view (hourly bucket aggregation)

---

### 3.3 RPC Functions (P0)

* [ ] Implement Supabase RPCs:

  * [ ] `ar_add_topic_segment(...)`
  * [ ] `ar_reinforce_candidate(...)`
* [ ] Ensure UUID parameters
* [ ] Ensure callable via service role

---

### 3.4 Anchor System (P0)

#### 3.4.1 Canonical Anchors Table

* [ ] Confirm single `anchors` table
* [ ] Add / verify columns:

  * [ ] `source`
  * [ ] `mention_count`
  * [ ] `first_seen_at`
  * [ ] `last_seen_at`
  * [ ] `confidence`
  * [ ] `salience_score`
  * [ ] `human_time_index`
  * [ ] `reinforcement_count`

#### 3.4.2 Promotion Rules

* [ ] Promote only when repeated, persistent, and safe or affirmed
* [ ] Never auto‑promote emotionally charged memories
* [ ] Log promotion decisions only

---

### 3.5 Memory Items (P0)

* [ ] Enforce tiers: core / normal / sensitive
* [ ] Ensure fields: mention_count, confidence, importance, last_used_at
* [ ] Gate sensitive memory injection

---

### 3.6 Safety Preflight (P0)

* [ ] Implement `detectRiskSignals(text, context)`
* [ ] Implement `planSafetyResponse(signals)`
* [ ] Run safety before LLM call
* [ ] Enforce clarify‑first rule
* [ ] Log safety decisions only

---

### 3.7 Rhythm / Thread State (P0)

* [ ] `user_profile` table (timezone, prefs)
* [ ] `thread_state` table (mode, intensity, tone, last message time)
* [ ] Build and inject `[RHYTHM]` block after anchors

---

### 3.8 Prompt Construction (P0)

* [ ] Enforce canonical injection order
* [ ] Anchors always injected
* [ ] Memory items injected contextually
* [ ] Safety plan injected only when active
* [ ] Token caps enforced
* [ ] Dev‑only proof snapshot available

---

### 3.9 Chat API Wiring (P0)

* [ ] `/api/chat` flow:

  1. Auth + IDs
  2. Safety preflight
  3. Load anchors + memory
  4. Build prompt
  5. Call LLM
  6. Persist assistant message
  7. Non‑blocking reinforcement writes

---

### 3.10 Observability + Telemetry (47/N, P0)
- [X] Add `lib/arbor/telemetry/types.ts` with optional `_telemetry` in `ChatResponse`
- [X] Add `lib/arbor/telemetry/buildTelemetry.ts`:
  - [X] Inserts into `trace_logs`
  - [X] Strict try/catch: telemetry failures never break chat
- [X] Wire telemetry into `/api/chat` as strictly additive
- [X] Add `lib/arbor/syncRules.ts` (system_rules cache w/ TTL)
- [X] Add `lib/arbor/ProofSnapshot.ts` and populate `trace_logs.proof_snapshot`

---

### 3.11 Episodes + Consolidation (47/N, P0)
- [ ] Add `lib/arbor/stateMachine.ts` for episode lifecycle
- [ ] Add `lib/arbor/summarizeEpisode.ts` (JSON summary prompt)
- [ ] Add `lib/arbor/consolidateSession.ts`:
  - [ ] Only runs for `episodes.status = closed`
  - [ ] Idempotency guard (do not re-summarize)
  - [ ] Writes `episodes.summary_json` + marks `summarized`
- [ ] Decide trigger mechanism:
  - [ ] Cron/job
  - [ ] Admin endpoint
  - [ ] Background worker

---

### 3.12 Client Integration (Minimal, P0)

* [ ] Client sends thread_id (UUID)
* [ ] Client sends timezone + local time
* [ ] Temporary Chat (test) button retained

---

### 3.13 Acceptance Tests (P0)

* [ ] Anchors always injected
* [ ] Memory items injected when relevant
* [ ] Sensitive memories never leak
* [ ] Clarify‑first triggers exactly once
* [ ] Risk escalations occur pre‑LLM
* [ ] Rhythm state persists
* [ ] Reinforcement events logged correctly

---

### 3.14 Cleanup & Hardening (P1)

* [ ] Remove duplicate safety logic
* [ ] Confirm single anchor store
* [ ] Verify RLS + service role boundaries
* [ ] Performance check on hot queries

---

## Definition of Done (Phase 3)

* [ ] Memory loop works end‑to‑end (extract → store → retrieve → inject)
* [ ] Anchors are conservative and stable
* [ ] Safety behavior is predictable and explainable
* [ ] Rhythm continuity persists across sessions
* [ ] Reinforcement loop operates without prompt bloat
* [ ] Proof snapshots demonstrate correctness
