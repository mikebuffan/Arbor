# ARK Preview: worker-only deployment gate (source-only)

Status: review-only, default OFF. Builds do not authorize execution. This child of #214/#215 keeps Firefly production, Grove and the installed read-only ARK MCP separate. Do NOT merge or switch production branches.

## Verified starting facts (2026-09-26)
- ARK Preview database is the existing project `tzbpjbhroxiqftqwatnb`; recovery objective `e994f040-4fab-4d59-ae5b-df882579e410` holds `checkpoint-a` then `checkpoint-b`, both queued with zero attempts at last read.
- Existing Vercel `firefly-ark-sandbox` Preview deployments build this GitHub repository; its older production branch is `feature/ark-chatgpt-subsystem-20260918` and must remain untouched.
- The sandbox's project variable listing showed database URLs in Production + Preview, `SUPABASE_SERVICE_ROLE_KEY` in Production only, no inherited shared variables, and no ARK machine/execution switches. One `SUPABASE_URL` value was visually confirmed as the Preview project; the other URL and credential-project match still require independent confirmation.
- The read-only MCP host is **not** the worker; do not put execution secrets or routes there.

## Worker source boundary
- Exact Vercel worker project ID: `prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp` (`firefly-ark-sandbox`). Source refuses execution in Firefly, Grove or MCP project even if the same Preview branch and flags are present.
- Exact source branch: `feature/ark-mcp-reader-execution-deny-20260926` in `mikebuffan/Arbor`, root `apps/backend`.
- Worker deployment's `apps/backend/vercel.json` has `"crons": []`; trigger is **manual POST** only, not any existing system/memory heartbeat.
- `ARK_PREVIEW_WORKER_ONLY_HOST=true` makes middleware allow only POST `/api/admin/ark/heartbeat`. Every unrelated route returns 404, and invalid Preview environment returns 503. That route separately validates the machine Bearer token.
- Running the executor also independently demands dedicated-worker flag, `VERCEL_ENV=preview`, exact Vercel project ID, exact Git branch, exact Preview database, three existing execution switches, and a pinned objective; read-only MCP flag forbids execution. The code's two-task/10-second bound remains.
- Ordinary Preview branches stay default OFF. These source guards do not certify Vercel project permissions, correct service-role credential identity, or a successful live worker.

## Independent owner/operator approval gate — no secret values in chat
1. In the existing **firefly-ark-sandbox** project only, verify the exact deployment branch/commit and root. Confirm production branch remains the old known production branch, not this candidate.
2. Verify both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` match `https://tzbpjbhroxiqftqwatnb.supabase.co` in this Preview branch. Verify the Preview-specific service-role key actually belongs to this same ARK Preview project. Never reuse the Firefly/Grove/unknown Production key based only on a variable name.
3. Check whether Vercel supports **Preview branch-scoped** variables in this existing project. If this cannot be enforced for this branch, STOP; do not assign service-role key to all Preview branches. Consider a separately isolated project or local one-time rehearsal only after a separate decision.
4. Add restricted, branch-scoped `ARK_PREVIEW_WORKER_ONLY_HOST=true` **before** any privileged credential. Verify that unrelated endpoints 404 and wrong environment 503. Confirm `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF` are available at runtime; missing metadata must not be bypassed.
5. Only on the approved worker branch Preview, configure `SUPABASE_SERVICE_ROLE_KEY` (verified Preview key), `CRON_SECRET` (fresh random machine token), `ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT=true`, `ARBOR_ARK_ENABLE_LIVE_EXECUTION=true`, `ARBOR_ENABLE_ARK_EXECUTION=true`, `ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY=true`, `ARBOR_ARK_CANARY_OBJECTIVE_ID=e994f040-4fab-4d59-ae5b-df882579e410`. Keep `ARBOR_ARK_ALLOW_GLOBAL_EXECUTION` unset/false, `ARK_PREVIEW_MCP_READONLY_HOST` unset/false, and every schedule/cron disabled. Do not paste keys, token or headers into messages/screenshots.
6. Redeploy the exact worker Preview branch after scoped settings, verify its settings/ingress without sending machine credentials to unrelated URLs, and separately authorize one bounded **POST** to this host. Do not invoke the existing read-only MCP host for execution.

## Live acceptance (not yet done)
- Independently read target objective before every invocation; abort if it is not queued/checkpointed as expected. Never reuse the already completed `canary.read` objective.
- First independent invocation: A checkpoint sequence 1, A attempt 1, B still queued (0 attempts). Confirm durable checkpoint and lease cleared.
- At least 60 seconds after A checkpoint: independent second invocation: A completes after resume (attempt 2), B checkpoints (attempt 1). Confirm evidence and sequence.
- At least 60 seconds later: third independent invocation: B completes after resume (attempt 2), whole objective independently verified with no missing work.
- Re-read actual database `ark_objectives`, `ark_tasks`, `ark_checkpoints`, `ark_events`, then compare with ChatGPT `get_ark_status`. Report failures precisely; do not claim objective completed from HTTP 200, build green, or a single task result.
- After acceptance switch execution OFF/revoke the temporary machine credential if not needed, and decide on a separate scheduler authorization. Real research ingestion is a different gate.

## Persisted SQL acceptance — independently verified in disposable CI
- Dedicated Postgres 17 with the three existing version-controlled ARK migrations, synthetic owner/project and **three distinct `psql` processes**. No live Preview/Firefly/Grove database access.
- A checkpointed first, worker 2 resumed A and checkpointed dependent B, worker 3 resumed B and independently verified the objective. Both tasks have two attempts and checkpoint sequence 1; immutable evidence/events and no duplicate claim were asserted.
- An expired lease belonging to an unrelated synthetic objective remained unchanged by the pinned target's recovery cycles. The actual ARK Preview `pg_get_functiondef(ark_claim_next_task)` read on 2026-09-26 also shows the targeted cleanup and failed-objective filters **already scoped by `p_only_objective_id`**. Previous investigation handoff saying this specific live function is unscoped was stale; no migration is needed for this particular fix.
- The independent Postgres acceptance is a DB contract test, not proof that Vercel can invoke a real authorized backend worker. Do not promote it to the live worker gate.
- Multi-tick research checkpoint budgets, private-source handling and safe unattended processing remain separate gated research acceptance.
