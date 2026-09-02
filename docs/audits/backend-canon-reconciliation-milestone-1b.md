# Arbor Backend Canon Reconciliation — Milestone 1B

Status: PR 1B-A implementation and live-catalog reconciliation
Baseline: `ea909b7e968798c41a1e7e9c50719230e248c232`
Prepared on: 2026-07-27
Scope: backend canon, Supabase authorization boundaries, heartbeat/live-schema alignment

## 1. Authority and evidence rules

This report applies the following authority order:

1. Mike's explicit Milestone 1B instructions and accepted human decisions.
2. Accepted Handbook requirements and ADR-0001 through ADR-0014.
3. Current repository behavior, merged Milestone 1A evidence, verified live
   Supabase metadata, and deployed runtime evidence.
4. The `REFERENCE ONLY` archives, interpreted by Mike's timestamp and
   lower-in-file precedence rule.
5. Older audits and contextual schema snapshots.

The reference archives are design evidence, not executable migrations or
permission to change production data. A mechanically winning archive block is
rejected when it conflicts with a higher authority.

### Reference archive identity

| Archive | Governing timestamp supplied by Mike | Local copied-file timestamp | Size | SHA-256 |
| --- | --- | --- | ---: | --- |
| `REFERENCE ONLY-RAW_CODE_complete.txt` | `2026-07-10T04:04:09Z` | `2026-04-28T03:53:27.2806576Z` | 4,124,819 bytes | `05C7E8B0858410BCD12536642461B41460B72EDD93E2B8CD2CBC77CB2A3C87E5` |
| `REFERENCE ONLY-Arbor Master File Code.txt` | `2026-07-10T04:04:08Z` | `2026-04-28T16:54:21.5699361Z` | 676,921 bytes | `E684C2055D19051780CBEB4F390C882FD0CEFB2AB6DD7E4AFBC67FCF14FB2314` |
| `REFERENCE ONLY-arbor_code_new.txt` | `2026-07-10T04:04:08Z` | `2026-04-28T03:53:28.1175898Z` | 180,012 bytes | `709FF187AFB8097418ABF50A798E13F766DA793A4435890F17810A1130ABBE0A` |

The local timestamps conflict with Mike's explicit metadata. Mike's supplied
timestamps are therefore the governing timestamp evidence.

## 2. Reference-precedence review

| Subsystem | Highest-precedence reference evidence | Competing earlier evidence | Selected correction | Classification |
| --- | --- | --- | --- | --- |
| Memory schema | `RAW_CODE_complete`, supplied timestamp `04:04:09Z`, approximately lines 135238–135355, lower backend block: `memory_items` with `label`, `content`, `is_pinned`, and `last_seen` | `Arbor Master File Code`, approximately lines 21150–21204, says "No new table. Use memory_items" but proposes ledger columns; earlier RAW blocks use `mem_key`, `mem_value`, `strength`, `reinforcement`, or separate anchor tables | Preserve the verified live v2 `key/value/tier/scope` table. Do not apply either unapproved migration proposal. | Highest reference block: **HISTORICAL PROPOSAL**. Live v2: **CANONICAL CURRENT**. |
| Memory pipeline | `RAW_CODE_complete`, approximately lines 135736–135826: recall/inject before the model, extract/gate/store afterward | RAW approximately lines 119738–120324 place retrieval inside `buildPromptContext`; earlier blocks contain prompt caches and parallel route-local injection | Preserve the accepted sequencing, but keep `buildPromptContext.ts` as the sole final assembler and prevent route-local injection. | **CANONICAL WITH CORRECTION** |
| Supabase clients | `RAW_CODE_complete`, approximately lines 135505–135511: service-role-only helper; route auth remains unwired at approximately 135757–135769 | Earlier RAW blocks repeatedly instantiate service-role clients; current repository has three bearer helpers and three service helpers | Apply ADR-0005: one request-scoped bearer client and one server-only admin client. Archive admin-only access is rejected. | Archive block: **LEGACY**. Accepted two-client boundary: **CANONICAL WITH CORRECTION**. |
| Prompt assembly | Lower RAW chat example assembles its own memory block | RAW approximately lines 119738–120324 and current repository place retrieval and assembly in `buildPromptContext.ts` | Current `buildPromptContext.ts` remains the sole final owner. Prompt caching remains disabled. | **CANONICAL CURRENT** |
| Heartbeat | RAW approximately lines 130244–130264: Vercel GET cron and sequential maintenance | Current secured Milestone 1A GET/POST wrapper uses `CRON_SECRET`; RAW cron has no authentication and queries historical `user_identity`/`memory_anchors` | Preserve secured GET/POST delegation. Align only the internal handler to live schema and error propagation. | Wrapper: **CANONICAL CURRENT**. Archive task body: **LEGACY**. |
| Decay and reinforcement | RAW approximately lines 135350–135355 and 135678–135703: touch `last_seen`; apply decay at retrieval ranking time from importance and recency | RAW approximately lines 129035–129064 and 130757–130799 persist `reinforcement`; current code queries nonexistent `strength` | Do not invent a persistent replacement. Quarantine strength-based maintenance pending an approved lifecycle contract. | Ranking-time decay: **CANONICAL WITH CORRECTION**. Persistent strength task: **LEGACY**. |
| Memory logging | Lowest memory block stores structured metadata with memory rows; it does not establish `memory_pending` as a general log table | Current logger inserts nonexistent `event`, `level`, `duration`, and `context` columns | Retain the compatibility logger only with verified live columns and redacted payloads. | **COMPATIBILITY ONLY** |
| Jobs | RAW approximately lines 129301–129310 proposes an in-process nightly function; approximately lines 130244–130264 proposes Vercel cron | Current `lib/jobs/queue.ts` assumes absent `job_queue`; live catalog contains `system_jobs` instead | Do not create or silently remap a queue. Mark `job_queue` code inactive pending a separate job architecture decision. | **HISTORICAL PROPOSAL** / **REQUIRES HUMAN DECISION** |
| Reflections | Later RAW material contains bounded reflection demos but no integrated production `memory_reflections` contract | Current reflection code writes the absent table and sends private memory text to a model | Quarantine heartbeat invocation. Do not create the table or run the subsystem. | **HISTORICAL PROPOSAL** |
| User/project ownership | Lower RAW examples pass user/project IDs but combine them with service-role access and an unwired auth function | Current chat derives identity from auth and verifies project/conversation ownership; several memory/import paths remain incomplete | Server-derived identity plus independent project and conversation checks control. | **CANONICAL WITH CORRECTION** |

## 3. Verified live catalog boundary

On 2026-07-28, the production Supabase catalog was queried read-only through
the authenticated Supabase management connection. No application row contents
were read and no database object or policy was changed.

### Relevant live tables

- `projects`: `id`, `user_id`, `name`, `persona_id`, `framework_version`,
  `created_at`, `updated_at`, `persona`, `description`
- `conversations`: `id`, `user_id`, `created_at`, `project_id`, `updated_at`,
  `title`
- `messages`: `id`, `conversation_id`, `user_id`, `role`, `content`,
  `created_at`, `deleted_at`, `expires_at`, `project_id`, `episode_id`
- `memory_items`: `id`, `user_id`, `project_id`, `conversation_id`, `key`,
  `value`, `tier`, `scope`, `user_trigger_only`, `importance`, `confidence`,
  `locked`, `mention_count`, `correction_count`, `last_seen_at`,
  `last_reinforced_at`, `status`, `excluded_from_memory`, `pinned`,
  `deleted_at`, `delete_reason`, `embedding`, `created_at`, `updated_at`
- `memory_pending`: `id`, `user_id`, `project_id`, `question`, `ops`,
  `created_at`, `memory_key`, `event_type`, `payload`
- `system_locks`: `id`, `name`, `locked_at`, `released_at`, `is_active`
- `system_heartbeats`: `id`, `created_at`, `status`, `processed_users`, `notes`
- `system_jobs`: `id`, `type`, `status`, `payload`, `created_at`, `started_at`,
  `completed_at`, `error_message`, `retry_count`, `next_run_at`, `last_error`
- `app_users`: `id`, `created_at`
- `conversation_imports`, `conversation_import_chunks`, `billing_customers`,
  and `chat_attachments` are present.

### Absent live tables

- Public `users`
- `memory_reflections`
- `job_queue`

### Live RPC names

- `ar_add_topic_segment`
- `ar_reinforce_candidate`
- `bump_usage_turn`
- `cleanup_expired_messages`
- `match_memories`
- `match_memory_items`
- `touch_memories`
- `update_memory_strength`

### RLS, policies, and grants

- RLS is enabled on every listed public table and on `storage.buckets` and
  `storage.objects`. Forced RLS is false.
- `projects`, `conversations`, `messages`, `memory_items`, `memory_pending`,
  `conversation_imports`, and `conversation_import_chunks` have ownership
  policies based on `auth.uid() = user_id`.
- `memory_items` policies enforce user ownership but do not independently
  assert project ownership. API routes must therefore validate a project
  before operating on a client-supplied project ID.
- `chat_attachments` policies enforce the authenticated user plus project,
  conversation, and storage-path relationships.
- `billing_customers`, `app_users`, `system_locks`, `system_heartbeats`, and
  `system_jobs` have RLS enabled but no policies. They are inaccessible to an
  ordinary user client despite broad table grants.
- `anon`, `authenticated`, and `service_role` currently have broad table
  privileges on the inspected tables. RLS is the active row boundary.
  Narrowing grants is desirable but is a human-gated database change.

### RPC security and execution

- The inspected RPCs are owned by `postgres`.
- `match_memory_items`, `match_memories`, `touch_memories`, and
  `update_memory_strength` are security invoker functions.
- `match_memory_items` is executable by `PUBLIC`, `anon`, `authenticated`, and
  `service_role`; it accepts `p_user_id`, has no project parameter, and does not
  return `project_id`.
- Because `match_memory_items` is security invoker, caller RLS applies, but its
  result cannot be separated by project after the call. Active scoped vector
  retrieval is therefore disabled until an approved RPC contract supplies
  trustworthy project scope.
- `match_memories` accepts `p_project_id`, but switching the canonical RPC is
  not inferred as an architecture decision in this PR.
- The inspected RPCs except `bump_usage_turn` lack a fixed `search_path`.
- `cleanup_expired_messages()` is `SECURITY DEFINER`, executable by anonymous
  and authenticated roles, and has no fixed `search_path`. Supabase Security
  Advisor reports this as externally facing. Revoking execution or changing
  its security mode requires a separate approval gate.

### Constraints, indexes, and storage

- `system_locks.name` has a verified unique constraint.
- `memory_items` has `UNIQUE (user_id, key)`. This conflicts with storing the
  same key independently in two projects owned by one user. Application code
  now refuses to select or mutate another project's row, but a same-key insert
  in a second project fails closed until a human-approved constraint change.
- The live project-scoping index is
  `(user_id, project_id, updated_at DESC)`, but it is not unique.
- Project, conversation, message, import, attachment, and memory foreign keys
  were verified, including user references to `auth.users` where present.
- The only storage bucket is private `chat-attachments`, with a 10 MiB limit
  and an explicit MIME allowlist. Storage policies require the authenticated
  user's path prefix; the stricter policies also validate metadata ownership.

### Remaining unverified behavior

- No live two-token CRUD test was run against production user rows.
- Cross-user and cross-project behavior is supported by catalog evidence and
  mock/static tests, but a database-backed two-user suite still requires an
  isolated Supabase branch or dedicated test project.
- No migration, RLS/policy, grant/revoke, RPC, constraint, index, or storage
  change was performed.

## 4. Supabase client factories and callers

| Current helper | Current behavior | Direct callers | Canon status |
| --- | --- | --- | --- |
| `lib/auth/requireUser.ts` | Delegates per-request bearer creation to `lib/supabase/user.ts`, then validates `auth.getUser()` | Chat, imports, Stripe checkout, admin/debug routes, misplaced memory routes | **CANONICAL CURRENT** |
| `lib/supabaseFromAuthHeader.ts` | Delegating request-scoped user-client wrapper | Conversations, default project, memory reset, Stripe portal | **COMPATIBILITY ONLY** |
| `lib/supabase/bearer.ts` | Delegating request-scoped user-client wrapper | Settings, memory items/item/confirm/correct/correction/delete/export, misplaced anchor routes | **COMPATIBILITY ONLY** |
| `lib/supabase/admin.ts` | Cached server-only service-role client plus retry/telemetry wrapper | Admin decay, compatibility logger, tasks, system loop, Stripe portal, webhook, controlled jobs/imports | **CANONICAL CURRENT** for enumerated internal use |
| `lib/supabaseServer.ts` | Duplicate cached service-role client | Stripe webhook | **COMPATIBILITY ONLY** |
| `lib/supabase/server.ts` | Delegates to the admin client without cookies or request bearer state | Memory strength compatibility path | **COMPATIBILITY ONLY** |
| `lib/supabase/browser.ts` | SSR browser client | Login UI | Client-side, outside the two server-client count. |
| `lib/supabase/client.ts` | Global anon browser client | No verified callers | **LEGACY**, retained under non-deletion rule. |
| `lib/supabase/ssr.ts` | Empty placeholder | None | **HISTORICAL PROPOSAL** |
| Direct `createClient` in `app/debug/chat/page.tsx` | Browser debug client | Debug page | Client-side diagnostic; review separately. |
| Direct `createClient` in `scripts/import_chatgpt/runImport.ts` | Service-role import client | Controlled script | **COMPATIBILITY ONLY**; allowed internal import with explicit ownership. |

Implemented target:

- `lib/supabase/user.ts`: sole request-scoped bearer client factory.
- `lib/supabase/admin.ts`: sole server-only service-role client factory.
- Existing duplicate helpers delegate as compatibility wrappers.
- No global singleton may contain request cookies or bearer state.
- Active prompt, anchor, retrieval, storage, correction, and reinforcement
  paths receive the request-scoped user client through dependency injection.

## 5. Authentication and ownership helpers

### Canonical current behavior

`/api/chat`:

- derives user identity through `requireUser`;
- creates or resolves a project with the user client;
- verifies supplied project ownership;
- verifies supplied conversation ownership under both user and project;
- returns 404 for foreign project or conversation.

### Required corrections

- Move bearer client creation to one factory while keeping `requireUser` as the
  validation boundary.
- Add reusable project and conversation ownership helpers.
- Use authenticated identity, never request-body identity.
- Verify project ownership before any privileged operation receives a
  client-supplied project ID.
- Verify conversation ownership independently rather than inferring it from
  project ownership.
- Keep foreign-resource behavior non-enumerating: 404, not an ownership leak.

## 6. Canonical memory pipeline

Accepted sequence:

1. Authenticated user message.
2. `extractor.ts` for post-response extraction.
3. `store.ts` for v2 storage.
4. `retrieval.ts` for v2 retrieval.
5. `buildPromptContext.ts` for final memory selection and injection.
6. Model response.
7. Server postcheck.
8. Background extraction, reinforcement, and redacted logging.

Current active chat follows the accepted single final builder. Implemented
corrections:

- `retrieval.ts`, `anchors.ts`, `store.ts`, and `buildPromptContext.ts` use an
  injected request-scoped user client.
- `findExisting` scopes by authenticated user, project, and key.
- Vector retrieval is disabled because the live RPC cannot prove project scope.
- Retrieval no longer logs the current user message or memory contents.
- Retrieval caching remains disabled.
- Active confirm and export routes no longer instantiate the legacy
  `MemoryService`; that compatibility class remains under the non-deletion rule.
- `logger.ts` and `decisionOutcome.ts` remain enumerated admin-backed
  compatibility paths because their live write policies are absent or their
  schema alignment belongs to PR 1B-B.

## 7. Routes under `app/api` and misplaced routes

Files under `apps/backend/app/api/**/route.ts` are production route entry
points.

The following are not normal Next.js route entry points at their current
locations and are classified **MISPLACED**:

- `lib/memory/explicit/route.ts`
- `lib/memory/list/route.ts`
- `lib/memory/anchors/list/route.ts`
- `lib/memory/anchors/set/route.ts`

They remain present under the non-deletion rule. Their imports do not make them
production HTTP routes.

The canonical correction endpoint is `/api/memory/correct`.
`/api/memory/correction` is **COMPATIBILITY ONLY** and must not evolve into a
second implementation.

## 8. Memory extraction, storage, correction, retrieval, reinforcement, and logging

| Component | Current behavior | Classification |
| --- | --- | --- |
| `lib/memory/extractor.ts` | Active chat extraction | **CANONICAL CURRENT** |
| `lib/memory/store.ts` | Active v2 upsert/correction/reinforcement; user-client/RLS backed; live uniqueness remains user/key | **CANONICAL WITH CORRECTION** |
| `lib/memory/retrieval.ts` | Active v2 direct retrieval; user-client/RLS backed; vector path disabled because the RPC has no project contract | **CANONICAL WITH CORRECTION** |
| `lib/memory/anchors.ts` | Active project/core rows in `memory_items`; user-client/RLS backed | **CANONICAL CURRENT** |
| `lib/memory/assembleMemoryBlock.ts` | Active final selection helper invoked by prompt builder | **CANONICAL CURRENT** |
| `lib/prompt/buildPromptContext.ts` | Sole final assembly owner; prompt cache disabled | **CANONICAL CURRENT** |
| `lib/memory/memoryService.ts` | Uses absent `mem_key`, `mem_value`, `display_text`, `discarded_at`, and related fields | **LEGACY** |
| `lib/memory/reflection.ts` | Uses v2 reads but writes absent `memory_reflections` | **HISTORICAL PROPOSAL** |
| `lib/memory/logger.ts` | Inserts nonexistent columns and may retain private payloads | **COMPATIBILITY ONLY**, correction required |
| `lib/tasks/decay.ts` | Queries and writes absent `strength` | **LEGACY** |
| `lib/tasks/sync.ts` | Queries absent `mem_key` and `mem_value` | **LEGACY** |
| `lib/tasks/reflection.ts` | Queries absent `mem_key`; invokes absent reflection storage | **LEGACY** |

## 9. Heartbeat, locks, decay, sync, reflection, and jobs

### Heartbeat wrapper

`app/api/admin/system/heartbeat/route.ts` is **CANONICAL CURRENT**:

- GET and POST delegate to one handler.
- `Authorization: Bearer <CRON_SECRET>` is required.
- Missing configuration fails closed.
- External success remains `{ "ok": true }`.

### Internal loop

`lib/system/loop.ts` is **CANONICAL WITH CORRECTION**:

- replace `key/updated_at` lock queries with
  `name/locked_at/released_at/is_active`;
- remove the nonexistent public `users` scan;
- make lock/query/task errors observable and thrown;
- release a held lock in `finally`;
- do not return apparent success after swallowed failures.

Atomic lock safety cannot be proven until the relevant live uniqueness
constraint or RPC is verified. No new constraint or RPC is authorized.

### Maintenance subsystems

- Persistent strength decay: quarantine; approved replacement semantics do not
  exist.
- Sync: if retained, read only v2 `key/value` columns and report a real result.
- Reflection: explicitly skip; `memory_reflections` is absent.
- `job_queue`: inactive and absent; do not remap silently to `system_jobs`.

## 10. RPCs and direct database calls

- `match_memory_items` remains the intended vector retrieval RPC.
- The active request path does not call it because its live return type omits
  project identity. Direct user-client retrieval is used instead.
- When an approved project-scoped RPC contract exists, the server must supply
  the authenticated user ID; client input must never control `p_user_id`.
- `update_memory_strength` exists live, but its semantics do not justify
  inventing a persistent decay model.
- Direct table calls must include authenticated user and intended
  project/conversation scope even when the admin client is temporarily
  unavoidable.

## 11. Imports and Stripe

### Imports

- `/api/imports` is an ordinary authenticated route using the user client.
- The controlled ChatGPT import script uses service-role access and is an
  enumerated internal exception.
- `ensureProjectRow` now creates a missing project with the explicit import
  user ID and rejects an existing project owned by another user.
- Client-provided or script-supplied project IDs require ownership validation.

### Stripe

- Checkout is user-authenticated and does not query Supabase with admin.
- Portal retains a narrowly documented admin read filtered by the
  authenticated user because `billing_customers` has no ordinary-user policy.
- Webhook uses service-role access after Stripe signature verification. This
  is an enumerated internal admin exception.

## 12. Retained admin callers

### Clearly internal or schema-gated exceptions

- Stripe webhook processing
- Machine-authenticated heartbeat and maintenance
- Admin-authorized global maintenance
- Controlled import script
- Controlled `system_jobs` enqueue after an admin re-check of import ownership
- Stripe portal customer lookup, filtered by the authenticated user
- Decision-outcome insertion because authenticated users have SELECT only
- Compatibility logging

Prompt project lookup, memory retrieval/anchors, memory
storage/correction/reinforcement, and memory list/item/export/confirm now use
the request-scoped user client. Service-role removal is intentionally not
claimed for the enumerated exceptions above.

## 13. Two-user/two-project test plan

Implemented mock/static tests cover:

- request-scoped clients never reuse bearer state;
- identity always comes from `auth.getUser()`;
- ownership helpers return 404 for foreign project and conversation;
- same-user project lookups cannot select or mutate another project's row;
- imports include authenticated ownership;
- ordinary route source files do not instantiate a service-role client;
- internal webhook/cron/job modules retain explicitly tested admin access;
- scoped retrieval does not call the unsafe live vector RPC;
- active prompt and memory modules do not import the admin factory;
- the controlled import-job exception re-checks user ownership.

Database-backed tests remain blocked until an isolated environment is
available:

- cross-user select/insert/update/delete denial;
- cross-project RLS behavior;
- spoofed `user_id` denial;
- arbitrary-`p_user_id` behavior under a real authenticated JWT;
- storage object ownership.

## 14. Human approval gates

Approval is required before:

- migration, RLS/policy, grant/revoke, RPC, index, constraint, or storage changes;
- changing the canonical memory model;
- changing the public global-decay contract or inventing decay semantics;
- creating `memory_reflections`, `job_queue`, or public `users`;
- enabling Vercel Cron or configuring `CRON_SECRET`;
- deleting or renaming compatibility/legacy files;
- merging either Milestone 1B draft PR.

## 15. Bounded implementation split

### Draft PR 1B-A — Supabase authorization boundaries

Proceed with:

- one canonical request-scoped user factory;
- one server-only admin factory;
- compatibility wrappers for duplicate helpers;
- removal of cross-request request-state client caching;
- reusable ownership helpers;
- user/project/key scoping in `findExisting`, with the live
  `UNIQUE (user_id, key)` conflict retained as a human decision;
- import project ownership correction;
- mock/static isolation tests;
- enumerated retained admin callers;
- direct user-client prompt, anchor, memory read/write, and memory-route access;
- disabled vector retrieval until project-scoped RPC output is approved.

### Draft PR 1B-B — Heartbeat/live-schema alignment

Proceed independently from a clean intended base with:

- live lock columns;
- no public `users` query;
- v2-only maintenance reads;
- explicit quarantine of absent subsystems;
- propagated required-task failures;
- live-shaped, redacted compatibility logging;
- unchanged machine-auth and external heartbeat success contract.

Do not invent persistent decay semantics or an atomic-lock constraint.
