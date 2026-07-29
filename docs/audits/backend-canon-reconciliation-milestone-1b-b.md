# Arbor Backend Canon Reconciliation — Milestone 1B-B

Status: implementation evidence in progress

Branch: `codex/milestone-1b-heartbeat-schema-alignment`

Base: `ea909b7e968798c41a1e7e9c50719230e248c232`

Prepared: 2026-07-28

## 1. Scope and non-actions

This bounded pass aligns heartbeat and maintenance code with verified live
Supabase contracts. It does not change the external heartbeat response, enable
Vercel Cron, configure or rotate secrets, mutate production rows, create a
migration, or change RLS, grants, RPCs, constraints, indexes, or storage.

It does not depend on the unmerged Milestone 1B-A branch.

## 2. Reference files and precedence

Mike's explicit instruction records these governing modification timestamps:

| Reference | Governing timestamp |
| --- | --- |
| `REFERENCE ONLY-RAW_CODE_complete.txt` | 2026-07-10T04:04:09Z |
| `REFERENCE ONLY-Arbor Master File Code.txt` | 2026-07-10T04:04:08Z |
| `REFERENCE ONLY-arbor_code_new.txt` | 2026-07-10T04:04:08Z |

The workspace copies have older April filesystem timestamps. Those dates are
recorded as copy-metadata drift and do not override Mike's explicit precedence
instruction.

| Reference | Bytes | SHA-256 |
| --- | ---: | --- |
| `REFERENCE ONLY-RAW_CODE_complete.txt` | 4,124,819 | `05C7E8B0858410BCD12536642461B41460B72EDD93E2B8CD2CBC77CB2A3C87E5` |
| `REFERENCE ONLY-Arbor Master File Code.txt` | 676,921 | `E684C2055D19051780CBEB4F390C882FD0CEFB2AB6DD7E4AFBC67FCF14FB2314` |
| `REFERENCE ONLY-arbor_code_new.txt` | 180,012 | `709FF187AFB8097418ABF50A798E13F766DA793A4435890F17810A1130ABBE0A` |

Important precedence evidence:

| Subsystem | Current repository | Live contract | Highest-precedence reference evidence | Selected correction | Rejected alternative |
| --- | --- | --- | --- | --- | --- |
| Heartbeat wrapper | Secured GET/POST delegates to one handler and returns `{ok:true}` | `CRON_SECRET` is server-only deployment configuration | No later integrated archive block supersedes merged Milestone 1A behavior | Preserve wrapper and response unchanged | Public or unauthenticated heartbeat |
| System lock | Queries nonexistent `key/updated_at` | `id`, `name`, `locked_at`, `released_at`, `is_active`; unique `name` | Current/live evidence outranks incomplete archive concepts | Use live columns, fail on query/write errors, release in `finally` | Legacy `key/updated_at` row |
| User scan | Reads nonexistent public `users` | `app_users` exists but is not needed; projects carry ownership | No winning reference requires a user scan for the bounded live tasks | Remove user-table scan entirely | Creating public `users`, querying `auth.users`, or adopting `app_users` without need |
| Decay | Reads/writes absent `strength` | No `strength` column or approved persistent decay field | Lower RAW material around lines 130398, 130535, and 130966 describes gradual/time-based reinforcement decay conceptually | Quarantine and report `memory_decay_schema_unavailable` | Inventing a mapping to importance, confidence, or another live field |
| Sync | Reads `mem_key/mem_value` | `memory_items.key/value` | Later v2 memory schema is the accepted survivor | Read current `key/value`; return only an operational count | Propagating legacy field names |
| Reflection | Reads `mem_key` and writes absent `memory_reflections` | No `memory_reflections` table | Earlier RAW job/reflection proposals around lines 42210–42954 are not a later integrated storage contract | Quarantine and report `memory_reflections_table_absent` | Creating `memory_reflections` or silently pretending reflection ran |
| Jobs | Earlier modules propose `job_queue` | Live table is `system_jobs`; no accepted remapping contract | RAW `job_queue` examples around lines 42350–42954 are historical proposals | No queue creation or silent remap | Creating `job_queue` |
| Memory logging | Inserts nonexistent `event/level/duration/context` columns into `memory_pending` | Required `user_id`; optional `project_id`, `question`, `ops`, `memory_key`, `event_type`, `payload`; default `created_at` | Live schema and accepted privacy rules control | Write only verified columns for user-scoped events; route global heartbeat status to `system_heartbeats` | Spoofing a user ID for global events or logging private content |

## 3. Verified live catalog

Read-only catalog queries were rerun against Supabase project
`ncpdlyakrzfvobmwzbon`. No application row data was read.

### `system_locks`

- `id uuid not null default gen_random_uuid()`
- `name text not null`
- `locked_at timestamptz null default now()`
- `released_at timestamptz null`
- `is_active boolean null default true`
- primary key on `id`
- unique constraint on `name`

### `system_heartbeats`

- `id uuid not null default gen_random_uuid()`
- `created_at timestamptz null default now()`
- `status text not null`
- `processed_users integer null default 0`
- `notes text null`

### `memory_pending`

- `id uuid not null default gen_random_uuid()`
- `user_id uuid not null`
- `project_id uuid null`
- `question text null default ''`
- `ops jsonb null default '{}'`
- `created_at timestamptz not null default now()`
- `memory_key text null`
- `event_type text null`
- `payload jsonb null`

### Relevant absences

- No public `users`
- No `memory_reflections`
- No `job_queue`
- No `memory_items.strength`
- No `memory_items.mem_key`
- No `memory_items.mem_value`

## 4. Selected implementation

- The heartbeat reads and writes only verified lock columns.
- Lock acquisition/read/write/release errors propagate.
- Required task or project-query failures propagate to the secured route, which
  returns its existing generic 500 response rather than false success.
- An active fresh lock is an explicit safe skip.
- Decay and reflection return structured skipped results without database or
  model access.
- Project sync reads active, non-deleted v2 memory rows with `key/value` and
  returns only a count.
- Successful, skipped, and failed loop outcomes use `system_heartbeats`.
- `processed_users` remains zero because there is deliberately no user scan.
- Compatibility logging writes `memory_pending` only when a real authenticated
  user ID is present.
- Logger payloads allow only bounded operational primitives and omit IDs,
  authorization material, prompts, messages, summaries, keys, values, errors,
  and stacks.

## 5. Security and Companion Impact

Security improvement:

- nonexistent-column failures cannot be swallowed into HTTP 200;
- no privileged scan of a nonexistent user table;
- no private user content is included in heartbeat or compatibility-log notes;
- no global system event is assigned to a fabricated user-owned pending row.

Companion Impact:

- background persistent decay remains inactive;
- reflection generation remains inactive;
- project memory sync remains a bounded schema-aligned scan/count, not a new
  distribution engine;
- the public heartbeat success body is unchanged.

These limitations are intentional until Mike approves the missing persistence
and subsystem contracts.

## 6. Known limitation and human gates

The unique `system_locks.name` constraint is verified, but the client-side
read/upsert sequence is not a fully atomic compare-and-set lock. A transactional
RPC or other database contract would require separate approval. This PR does
not invent one.

Approval remains required before:

- migrations or any schema object;
- RLS, policy, grant, or revoke changes;
- RPC changes;
- Cron enablement or secret changes;
- external API response changes;
- creating `memory_reflections`, `job_queue`, or public `users`;
- deletion or rename;
- merge.

## 7. Verification plan

Tests prove:

- live lock column names are used;
- no public `users` or `app_users` scan occurs;
- an active lock is reported as skipped;
- required task and database failures propagate;
- the lock is released after a task failure;
- decay and reflection report explicit unavailability;
- sync uses `key/value` and propagates errors;
- `memory_pending` inserts use only live columns;
- private logging payload fields are removed;
- global events are not written to user-owned `memory_pending`;
- existing missing, invalid, and unconfigured `CRON_SECRET` behavior remains;
- the route returns 500 when the internal heartbeat rejects.
