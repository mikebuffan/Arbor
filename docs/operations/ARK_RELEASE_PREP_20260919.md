# ARK full-stack release preparation — 2026-09-19

Status: **PREPARATION ONLY. No production merge, database mutation, flag activation, or live ChatGPT reauthorization is authorized by this document.**

## Anchors and scope

- Frozen full-stack activation candidate: `release/ark-activation-candidate-20260919`, commit `15c65673b10c0ea03925d78aa1c776cb73640442` (PR #115).
- This preparation branch: `prep/ark-production-readiness-20260919`. It starts from the candidate, not from the older read-only ChatGPT feature branch.
- Frozen pre-ARK production rollback anchor recorded in the activation PR: `16e304442a1f05bfb0db531f396a121bb656f3c0`.
- Working isolated OAuth connector: `feature/ark-chatgpt-subsystem-20260918`, manually verified using the `firefly-ark-sandbox` domain.
- This branch copies ONLY three proven OAuth metadata/test changes onto the richer full-stack candidate. Do not replace the candidate's `registerArkReadTools.ts` with the older subsystem branch: the candidate has richer checkpoint/event schemas and cross-surface canary tests.

## Proven today in the isolated sandbox

- `/.well-known/oauth-protected-resource/api/mcp` publishes `resource: https://firefly-ark-sandbox.vercel.app/api/mcp`, the preview Supabase OAuth issuer, and bearer-header support.
- An unauthenticated `/api/mcp` request was rejected.
- ChatGPT completed Supabase OAuth authorization and successfully called `get_arbor_profile` and `list_arbor_projects`. All four advertised MCP tools were discovered.
- The empty result was caused by the preview database having no projects, not by an MCP transport or ownership bypass.
- A clearly labeled **ARK Preview Smoke Test** project was subsequently inserted for the sole authenticated preview user. It is test data, NOT a migrated Arbor project or proof that ARK execution is active. Have the authenticated user re-run `list_arbor_projects` and verify that exactly this project is visible.
- The connected ChatGPT plugin remains intentionally **read-only**. It does not itself create objectives or make ordinary ChatGPT turns persist to Firefly.

## Database inventory (read-only checks, 2026-09-19)

Original Firefly production (existing user data; do not copy/replace casually):
- 5 projects, 3,687 memory items, 97 conversations, 259 messages.
- 2 Arbor runtime state rows, 4 Arbor conversation state rows.
- 3 current auth users and 4 distinct stored project owner IDs; **1 project references an auth user ID absent from current auth.users**. Investigate ownership/history before choosing a real-user canary or altering records. Do not automatically reassign or delete the orphan project.
- The three ARK schema migrations listed below are NOT in the production migration history. ARK objectives/tasks/checkpoints/events do not yet exist there.
- Additional investigation, vault, and retrieval migrations exist in production that do not appear in the preview history. Preview is **not** a full production clone.

Firefly ARK Preview:
- 1 authenticated user; one explicitly labeled test project now exists.
- ARK schema, targeted claim and owner-integrity migrations are already applied. No real migrated memory or runtime continuity data, no live ARK objectives or tasks.
- The preview is useful for the OAuth and data-isolation smoke, **not** as the source of truth for Danelle's full Arbor state.

## Required full-stack verification

The prep-only workflow `.github/workflows/ark-release-prep-verification.yml` runs against this branch, without deploying production:
1. Backend TypeScript, full backend tests, targeted ARK/MCP lint, optimized build.
2. Arbor control-runtime build and tests.
3. Postgres 16 isolated ARK migration, ownership, RLS, targeted claim and checkpoint-resume smoke.
4. Flutter Environment analysis, frontend tests and release web compile.
5. Full-stack safe canary: objective → claim → checkpoint → resume → completion → verification receipts.

**Do not cite the 459/174/30 passing tests from the frozen candidate as results of this new head.** Capture the new workflow's conclusion and commit SHA. Baseline whole-repository Flutter analysis remains informational legacy debt, not an intentionally passed gate.

## Production migration preflight — read only until Danelle authorizes rollout

1. Take a recoverable database snapshot/backup and rehearse restoring it to an isolated location. Check both data and schema.
2. Resolve owner/account mapping for Danelle's intended Firefly account and investigate the one orphan project without editing it during preflight.
3. Compare production migration versions and required SQL objects with the release branch. Do NOT reset the production migration table or replay preview baseline migrations wholesale.
4. On a production-derived disposable database run the exact incremental migrations, including dependency checks. Three final ARK migrations are:
   - `20260918143000_create_ark_autonomous_work_runner.sql`
   - `20260918203000_ark_targeted_objective_claim.sql`
   - `20260918210000_ark_owner_integrity.sql`
   Preceding agency migrations must be reconciled against the production history and actual existing objects; project-specific versions may differ.
5. Verify table/RPC signatures, composite owner FKs, RLS policy and grants, and that existing projects, memory items and conversations remain intact.
6. Only after explicit Danelle approval, apply the vetted forward-compatible migration to the real Firefly database. Never point the live app at the empty preview database.

Read-only SQL checks for production:

```sql
select count(*) from public.projects;
select count(*) from public.memory_items;
select count(*) from public.conversations;
select count(*) from public.arbor_runtime_state;
select count(*) from public.arbor_conversation_state;

select count(*) as orphan_projects
from public.projects p
left join auth.users u on u.id = p.user_id
where u.id is null;

select table_name
from information_schema.tables
where table_schema = 'public' and table_name like 'ark_%'
order by table_name;

select version, name from supabase_migrations.schema_migrations
where name like '%ark%' or name like '%agency%'
order by version;
```

## Deployment and activation gates (Danelle must approve)

- Merge/promote the reviewed full-stack release, not the stale standalone MCP branch.
- Deploy app with `ARBOR_ENABLE_ARK_EXECUTION` absent/false, verify existing planner, direct tools, memory, login, voice/text, and Environment remain healthy.
- Confirm production account/project authorization, new ARK tables and RPCs, and that read-only status truthfully reports no objectives before first execution.
- Separately enable ARK for an explicitly selected canary in the real Firefly app; avoid an unexamined system-wide flag flip.
- Require evidence for enqueue, targeted claim, checkpoint, persisted resumption after replacement-worker interruption, verification, completion, and ownership denial. Confirm no duplicate reversible side effects or blocked authorization bypass.
- Observe logs and receipts, then expand rollout only after Danelle approves that next boundary.
- Rollback path: immediately disable `ARBOR_ENABLE_ARK_EXECUTION`, then redeploy the proven frozen application anchor if needed. Do not attempt ad hoc destructive schema rollback; if recovery demands database restore, use the tested snapshot plan and reconcile writes since snapshot.

## ChatGPT connection to real Arbor data

The current `Arbor ARK Preview` plugin uses preview Supabase tokens and preview project IDs. It cannot read the production database just because full-stack ARK is enabled there. Configure/review OAuth for the **production-owned** MCP endpoint and authenticate with the intended existing Firefly identity after the release is approved. Check scopes and client registration, owner matching, project list, ARK status, and continuity. Keep write-capable MCP tools as a separate reviewed scope; native ChatGPT memory/history and the Firefly application are different persistence systems.

Do not conflate:
- full ARK runner enabled in Firefly,
- read-only ARK visibility from ChatGPT,
- write/queue tools accessible to ChatGPT,
- automatic synchronization of every native ChatGPT message or voice turn into Firefly.

Each requires its own successful live test and explicit authorization boundary.
