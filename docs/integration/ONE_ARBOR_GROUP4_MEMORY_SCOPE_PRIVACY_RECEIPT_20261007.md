# ONE ARBOR — Group 4 memory, retrieval and privacy reconciliation

Date: 2026-10-07. **Review/source repair only. Not deployed, merged, memory-ingested, or host-behavior accepted.**
Ownership exactly B05/B06/B07/B08/B09/B12/B13/B14. Refer to the owner's
`ONE_ARBOR_97_TASK_MASTER_G09_G11_20261007.docx` Library master.
Parent source: draft #340, exact SHA `595375d525cf561172449726ed0c086ab4ece7db`.
Deployed sandbox source, per Group 01 #344 ledger: draft #322 `f4021985b475651284c97aecbc3bdf03123478cc`, READY Preview deployment
`dpl_HAzY1hSBgF87VbVnnFhjawDaVpap`. Neither proves currently active MCP host memory behavior.
Group 01 #344 and Group 05 #343 were inspected before editing. They own
canonical release boundaries and longitudinal continuity respectively. Group 03
owns archive transport/reader; this Group 04 branch edits no archive, Time Core,
correction runtime state, Vercel deployment, navigation shell, or private documents.

## 1. What existed before this repair

- Backend `readRecall.ts` combines owned chronological archive inventory, lexical-only
  historical excerpts, episodes and durable memories, with per-store availability
  and bounded, attributed read receipts. It explicitly sets `useVectorSearch:false`.
- Backend `retrieval.ts` has a dormant opt-in vector path using `match_memories_v3`,
  which refreshes candidate eligibility through current owner-scoped rows and
  falls back to direct scoped reads. Source RPC contract restored in #322; no
  embedding call is enabled here.
- `selectForPrompt.ts` already rejects excluded/deleted/inactive records even
  when pinned or locked. Owner/project/conversation negatives exist in
  `retrievalExclusion.test.ts` and `projectIsolation.test.ts`.
- `memoryRecallQuery.ts` orients short acknowledgments via existing unfinished
  goal without treating the goal as authorization. Explicit corrections,
  durable promotion and time precedence have distinct authorization contracts.
- Grove `GroveMemoryShelfView` already provides authenticated, read-only
  selected-project cards with refresh, session invalidation, and visibility
  limits. `MemoryStateView` also references the existing document shelf.
  The memory shelf is not a primary-source archive or correction editor.

## 2. Concrete B12/B13/B14 source-level privacy defect

The normal `GET /api/memory/items` listing selected `user_trigger_only`,
`status`, `deleted_at`, and `tier` but **did not select or filter
`excluded_from_memory`**. Grove's existing memory shelf projection likewise
did not reject `excluded_from_memory`. An otherwise active, non-sensitive
project claim marked excluded could therefore be displayed in the library
despite being blocked in generation retrieval.

On this isolated branch the *existing* path was repaired, without a second
memory engine:

1. For default GET lists, the backend now includes the eligibility column
   and filters `excluded_from_memory=false` **before** the 500-row limit.
   The deliberately requested `includeDiscarded=true` owner review path
   remains available and continues to require the same authenticated owner.
2. The Grove shelf projection now permits only `excluded_from_memory == false`.
   Explicit true and absent/unknown eligibility both fail closed. Existing
   owner/project/conversation, deleted, sensitive and trigger-only filters remain.
3. Synthetic route negative tests cover owner/project gating, normal-list
   exclusion and the explicit discarded-review exception. Flutter tests cover
   excluded and missing-eligibility rows, foreign project and exact conversation
   restrictions. No real user memory is placed in fixtures.

Edited paths: `apps/backend/app/api/memory/items/route.ts`,
`apps/backend/lib/memory/__tests__/routeOwnership.test.ts`,
`apps/frontend/lib/environment/grove_memory_shelf.dart`,
`apps/frontend/test/grove_memory_shelf_test.dart`. CI is isolated in
`.github/workflows/one-arbor-group4-memory-privacy.yml`.
`ops/grove/source-only-ignore.mjs` is amended only to identify this exact
review branch; additive sibling branch entries from #343/#344 must be unioned
at composition rather than clobbered.

## 3. Eight-item status and safe next actions

| ID | Source and verification truth | Status / still required |
| --- | --- | --- |
| B05 Firefly integration | Existing owner-scoped durable memory, prompt selection, and project-only Grove shelf. No export was migrated here. | PARTIAL: authenticate deployed owner/project DB mapping, record schema/RLS/read receipts before broader integration. |
| B06 Semantic retrieval | Dormant vector retrieval, current-row refresh and direct fallback; live connector `readRecall` is lexical-only. | GATED: index/scope/privacy/provider-spend approval, negative cross-scope tests and semantic relevance baseline before activation. |
| B07 Temporal memory validity | Explicit correction chronology and candidate resolution exist; old vs current memory validity/supersession across *all* source classes is not proved. | PARTIAL: user-approved synthetic temporal matrix and deployed readback still needed; do not promote historical assertions. |
| B08 Memory changing decisions | Retrieved evidence reaches constructed prompt context in source tests. | GATED: matched-setting, user-approved host/model A/B showing a different authorized decision and a durable, blinded outcome receipt; never infer influence from retrieval alone. |
| B09 Automatic capture | Candidate extraction/promotion code exists; durable authorization checks remain. | GATED: no broad ChatGPT/Grove automatic capture or personal-data import authorized, enabled or claimed. |
| B12 Forgetting/scope isolation | Normal list exposure repaired here; core retrieval already checks current exclusion and scope. | SOURCE PATCHED, TEST GATED: exact-head CI and owner-authenticated negative live test; data deletion/forget action and cross-project readback not run. |
| B13 Memory Review UI | Existing read-only cards, scoped refresh and explicit "not a source" label. | PARTIAL: full owner-approved correction/review/edit UX, negative live acceptance and scope-aware pagination outstanding. |
| B14 Memory Library | Existing MemoryStateView, saved-memory shelf, document shelf. 500-row cap declared partial. | PARTIAL: unified archive browsing, device acceptance and original-document provenance not accepted; Group 03 retains archive ownership. |

## 4. Receipt and negative-control ledger

- **Source reads:** #322 and #340 PR metadata; Group 01 #344/Group 05 #343 collision files; current owned code at #340; bounded, read-only ARK Fresh App status/continuity.
- **ARK scope:** owned project `9366c350-5d82-49f5-b9ef-862af750e3a0`. Fresh App capability currently read-and-submit-read-tasks but cannot control objectives or run behavior tests. Protected STOP objective remains queued; this lane did not touch it.
- **No execution:** no application write/read of live memory rows, no embedding/model call, no transport/import, no project grant, no worker, no objective mutation, no deletion, no production deployment, no merge.
- **CI target:** the new isolated exact-branch workflow runs backend memory route/retrieval/scope tests plus TypeScript and Grove shelf/project-scope widget tests. Record its exact head and conclusion separately when available; a workflow definition is NOT a passed test.
- **Protected live negatives still NOT RUN:** foreign project/session, excluded/forgotten value, stale semantic result, old correction supersession, revoked permission, memory altered response, UI refresh on real sign-out/session switch.

## 5. Source, live retrieval and generated behavior are different

**Implemented source:** lexical owned archive/episode/durable-memory read interfaces,
current-row vector validity guard, prompt selection exclusion, and scoped library
cards, with the new default list/shelf exclusion repair.

**Live usage evidenced:** a bounded ARK connector status/continuity read was
available on the authenticated owned project. That is NOT a live memory recall
read, a live shelf rendering, an installed semantic vector connector or a
model-generated demonstration of durable memory decision influence.

**Unverified behavior:** whether arbitrary fresh conversations use the repaired
memories, whether retrieval changes an actual model decision, temporal conflict
resolution across imported histories, production forget consistency, and
complete user-facing review/edit behavior. Record UNKNOWN or NOT RUN rather than
claiming success.

Release owner must reconcile independent #343/#344 source-only allowlist entries
and source SHAs before composition. No release is authorized by this receipt.
