# ChatGPT ↔ ARK acceptance — same durable state, not just the worker

Status (2026-09-23): **The one-shot worker gate PASSED in real ARK Preview and was independently DB-verified.** The ChatGPT same-state gate remains BLOCKED pending a separately deployed Preview MCP host and an eligible authenticated custom-app connection. No unattended worker, app installation, OAuth connection or research-source access has been performed.

## Existing source — reuse, do not rebuild

- `apps/backend/app/api/mcp/route.ts`: authenticated MCP HTTP server at `/api/mcp`.
- `apps/backend/lib/mcp/registerArkReadTools.ts`: `get_arbor_profile`, `list_arbor_projects`, `get_ark_status`, `get_arbor_continuity`. All currently read-only; the schema expressly says `get_ark_status` cannot start or modify work.
- `apps/backend/lib/ark/readModel.ts`: reads scoped objectives, tasks, checkpoints and events from actual Supabase.
- `apps/backend/lib/mcp/auth.ts`: validates Supabase bearer token, grants `ark.read` only. No service-role key should ever go into ChatGPT or OAuth.
- Existing `lib/mcp/__tests__/fullStackCanary.test.ts` proves the MCP tool projects persisted checkpoint/completion snapshots, using **mocked data**, NOT an installed ChatGPT app or a live database.
- Dedicated research PR #212 CI now exercises these alongside the research worker and isolated PDF paths.

## The TWO independent tonight gates

**Worker gate — PASSED:** Mike ran the operator-approved one-shot against ARK Preview. Independent readback confirmed `inspect-preview` completed, `attempt_count=1`, `lease_owner=null`, saved `{verified:true,capability:'canary.read',previewOnly:true,source:'read_only_ark_preview_objective',attempts:1}`, objective completed with `all_tasks_completed_with_executor_verification` evidence, and event sequence `objective_enqueued`, `task_claimed`, `task_completed`, `objective_completed`. **Never rerun the consumed canary.**

**ChatGPT gate:** through an authenticated ARK MCP app whose Supabase OAuth issuer is the **same Preview project and owner** as the worker, this ChatGPT conversation can invoke `list_arbor_projects`, `get_ark_status` and `get_arbor_continuity` for the owned project and show the *same* task status, attempt count, completion evidence and timestamps observed directly via the Preview SQL readback. If the ARK app/connector is not installed or is connected to Firefly PRIMARY, then the Preview canary is invisible to that connection and ChatGPT gate is still BLOCKED. A successful CI fixture does not satisfy it.

Test with no secrets in chat:

1. Verify actual deployed MCP host URL, git SHA, and `/.well-known/oauth-protected-resource` announces correct `/api/mcp` resource and **Preview** Supabase OAuth issuer. Do not assume a Vercel project exists because code exists.
2. Connect that reviewed host as a ChatGPT app/plugin with user OAuth, not service-role credentials. The app must be visible to the ChatGPT session and permitted by the account. If not exposed, ask owner to connect it; do not claim chat runtime is automatically wired.
3. Call `get_arbor_profile` to confirm correct owner and read-only authority, then `list_arbor_projects` and select the verified ARK Preview Smoke Test project.
4. The first worker has **already run**. Call `get_ark_status` through the installed ChatGPT custom app and compare it with the independent DB receipt: one completed task, exactly one attempt, actual `canary.read` stored result, completed objective and completion evidence, relevant claimed/completed/objective events, non-stale `capturedAt`. Don't invent a checkpoint if the canary completed directly. `get_arbor_continuity` can accurately return unavailable if no continuity state exists.
5. If an additional before/after UI demonstration is desired, it requires a separately approved **new synthetic objective and safe executor**—not replaying the consumed one-shot.
6. If the app shows queued after DB completed, diagnose wrong Supabase environment/owner, stale app authorization, or host build; do not label it eventual consistency and silently pass.
7. Test a *new ChatGPT thread* in the same connected context. It must retrieve the same persisted state by ID rather than relying on previous thread memory.

## What ChatGPT can and cannot do after the read gate

ChatGPT **can** query live ARK state on demand and help interpret what's next. ARK's independently hosted worker may execute approved tasks outside chats once a real durable host/scheduler is deployed.

ChatGPT **cannot yet** issue or resume ARK work via the existing **read-only** MCP tools. The required next seam is a separately reviewed, authenticated, owner/project-scoped command interface (`request/resume/stop` with explicit bounds and audits), connected to the same durable ARK objectives. It must not expose service-role keys, let model text grant source access, override STOP, or silently create multi-hour authorization. No “ChatGPT can control ARK” claim before a live, permissioned write-command test.

A completed task is not proof that a scheduler is alive; confirm worker heartbeat/lease and newly saved receipts across separate invocations. User requests to continue in a chat are not equivalent to an automatic worker schedule.
