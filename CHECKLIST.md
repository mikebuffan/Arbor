# Arbor — Working Checklist (Phase 2 focus)

> Source of truth: Firefly/Arbor Roadmap (Phases 2–4).
> Phase 2 goal: Make memory visible, editable, and self-aware. :contentReference[oaicite:1]{index=1}

---

## Phase 2 — Memory Transparency & Reflection

### 2.1 UI — Memory Viewer (User-facing)
- [ ] Create UI route/page: `/app/memories/page.tsx` (or mobile equivalent) that:
  - [ ] Fetches memories via `/api/memory/list`
  - [ ] Groups/filters: core / normal / locked / ignored
  - [ ] “Edit” action → calls `/api/memory/correct`
  - [ ] “Delete/Forget” action → calls `/api/memory/delete` (soft delete)
  - [ ] Shows busy/loading + error states

**Roadmap reference**:contentReference[oaicite:2]{index=2}

---

### 2.2 API — Memory List
- [ ] Add API route: `/api/memory/list` (GET)
  - [ ] Requires auth (`requireUser`)
  - [ ] Reads from `memory_items` filtered by `user_id`
  - [ ] Ordered by most important / most recent
  - [ ] Returns `{ ok: true, items: [...] }`

**Roadmap reference**:contentReference[oaicite:3]{index=3}

---

### 2.3 API — Memory Correct
- [ ] Add API route: `/api/memory/correct` (POST)
  - [ ] Accepts `{ key, newValue }` (+ project scope if used)
  - [ ] Calls memory correction pipeline (store layer)
  - [ ] Returns success + locked status if applicable

**Roadmap reference**:contentReference[oaicite:4]{index=4}

---

### 2.4 API — Memory Delete (Soft delete)
- [ ] Add API route: `/api/memory/delete` (POST)
  - [ ] Soft delete flag in DB (do NOT hard delete by default)
  - [ ] Requires auth (`requireUser`)
  - [ ] Returns `{ ok: true }`

**Roadmap reference**:contentReference[oaicite:5]{index=5}

---

### 2.5 Reflection Agent (Backend)
- [ ] Verify existing `lib/memory/reflection.ts` is wired to:
  - [ ] Pull recent chat content
  - [ ] Propose memory updates safely
  - [ ] Write updates to `memory_items` via store layer
- [ ] Verify reflection is callable via a job/cron or an internal admin trigger

**Roadmap reference**:contentReference[oaicite:6]{index=6}

---

## Repo Audit Notes (Phase 2 readiness)

### Backend: what appears present
- [ ] Memory core modules exist (store/retrieval/reflection/anchors) — verify working end-to-end.
- [ ] Auth helper exists: `apps/backend/lib/auth/requireUser.ts`

### Backend: what’s missing or miswired (needs action)
- [ ] Memory List “route” exists but is in the wrong place:
  - Found at: `apps/backend/lib/memory/list/route.ts`
  - Needs to be relocated/implemented as a real Next route under `apps/backend/app/api/.../route.ts` (or your chosen API structure)
- [ ] No `/api/memory/correct` route found in the backend
- [ ] No `/api/memory/delete` route found in the backend

### Frontend/mobile: what’s missing
- [ ] `apps/frontend` is currently a placeholder (no committed mobile source)
- [ ] Memory Viewer UI does not exist in the repo yet

---

## Definition of Done (Phase 2)
- [ ] A signed-in user can open Memory Viewer and see their memory items.
- [ ] A user can edit a memory item (POST correct) and see it update immediately.
- [ ] A user can “forget” a memory item (soft delete) and it disappears from default list.
- [ ] Reflection exists and can be triggered (manual/admin is fine for now), producing safe memory updates.

---
