# ARK production reconciliation report — 2026-09-20

Prepared from live read-only inspections of original Firefly production, Firefly ARK Preview, GitHub PR #115, the tested release candidate, and Vercel preview state.

## Current verified state

- Release candidate head: `e7b86044de5bf90f389df14a2d404aad18c38be5`.
- PR #115: open, clean, mergeable, not merged.
- Candidate checks: backend verification, frontend verification, full-stack canary, migration smoke, control backend, backend build/test, and Flutter analyze/test all passed. Supabase Preview check was skipped.
- Latest candidate Vercel deployment is READY as a preview deployment, not production.
- Original Firefly production remains intact with 5 projects, 3,687 memory items, 97 conversations, 259 messages, and 3 auth users.
- Production has 0 `ark_*` tables.
- Production has 1 orphan project owner row; prior release notes identify it as a synthetic acceptance-test project. No ownership changes were made.
- Firefly ARK Preview currently has 1 project, 1 objective, 1 task, and 0 checkpoints.

## Exact dependency reconciliation found

Production already has:
- all 8 agency columns on `public.arbor_runtime_state`;
- `public.arbor_agency_idempotency`.

Production is missing:
- `public.arbor_claim_agency_state(...)`;
- policy `arbor_agency_idempotency_owner_update`;
- `public.arbor_work_jobs`;
- `public.arbor_claim_work_job(...)`;
- all four ARK durable carrier tables and their RPCs/ownership constraints.

The repository's historical migration filenames diverge from production beginning in the retrieval/agency period, so blindly replaying every migration file from the release branch is unsafe. A forward-only bundle was therefore created outside `supabase/migrations`:

`docs/operations/ARK_PRODUCTION_FORWARD_BUNDLE_20260920.sql`

It concatenates only the six tested migrations that correspond to objects confirmed absent in production:

1. `20260918023000_arbor_agency_first_claim.sql`
2. `20260918024500_arbor_agency_idempotency_update_policy.sql`
3. `20260918030000_arbor_autonomous_work_runner.sql`
4. `20260918143000_create_ark_autonomous_work_runner.sql`
5. `20260918203000_ark_targeted_objective_claim.sql`
6. `20260918210000_ark_owner_integrity.sql`

This bundle is intentionally NOT auto-run and is intentionally NOT in the migrations directory. It avoids accidentally replaying preview-only historical migrations whose version numbers do not match the live production history.


## 2026-09-20 follow-up: canary isolation safeguard (preparation branch only)

- The release candidate's heartbeat previously called an unscoped ARK worker whenever `ARBOR_ENABLE_ARK_EXECUTION=true`. That did not itself limit execution to the intended first canary.
- The reconciliation preparation branch now requires **both** `ARBOR_ENABLE_ARK_EXECUTION=true` and `ARBOR_ARK_CANARY_OBJECTIVE_ID=<UUID>` to let the heartbeat claim tasks for the selected durable objective.
- A separate `ARBOR_ARK_ALLOW_GLOBAL_EXECUTION=true` authorizes the unscoped worker later, after the canary has been verified. If both canary and global settings are present, the canary ID wins. Invalid nonempty canary IDs fail closed rather than widening to global.
- Targeted task claims now also scope database-side expired-lease cleanup and failed-objective propagation to the selected objective; a canary no longer changes unrelated queued/running jobs during claim. The exact production-bundle PostgreSQL 17 test seeds an unrelated expired job, proves targeted isolation, and separately proves the explicitly global worker still cleans it up.
- Missing or disabled execution flag still skips all heartbeat ARK work. No environment variables were changed in Vercel.
- The chat API is now independently gated: `ARBOR_ENABLE_ARK_EXECUTION=true` alone does NOT opt ordinary chats into the ARK tool dispatcher. Chat dispatch additionally requires `ARBOR_ENABLE_ARK_CHAT_EXECUTION=true`, after a separately reviewed interactive rollout. With the chat switch absent/false, ordinary chat keeps its prior direct agency execution path. The explicit canary UUID limits heartbeat claims only and must not be represented as globally limiting the chat API.
- This is a new runtime change **on PR #117's preparation branch only**, not the still-frozen PR #115 release candidate. Do not promote PR #115 alone and mistake it for containing the isolation safeguard: reconcile the tested preparation head before a production activation.
- These flags scope the background heartbeat, not a general authorization model for interactive requests. Ownership and executor tool protections remain independently required.
- GitHub verification on the exact prepared head must pass before this change can be marked release-ready.

## Remaining hard gate

A verified restorable backup of original Firefly still has not been independently proven. The repaired local rehearsal script is preserved in the user's file library, but no successful restore report was available during this audit. Do not apply production DDL until the backup restore is verified.

## Safe next sequence after restore verification

1. Apply the forward-only bundle to original Firefly.
2. Verify ARK tables, RPC signatures, policies, owner constraints, and unchanged counts for projects/memories/conversations.
3. Reconcile and merge this tested PR #117 preparation head **into the release candidate branch first**; re-run the release checks on that new candidate, then merge/promote PR #115. Never promote the older PR #115 head alone.
4. Deploy with `ARBOR_ENABLE_ARK_EXECUTION` absent/false.
5. Verify existing Firefly login, planner, tools, memory, text/voice, and production account ownership.
6. Enable a single ARK canary.
7. Prove enqueue -> targeted claim -> checkpoint -> interruption -> persisted resume -> verification -> completion, including ownership denial and no duplicate side effects.
8. Expand only after the canary is clean.

## Changes made during this reconciliation

- No production database mutation.
- No production deployment.
- No ownership reassignment.
- No ARK execution flag activation.
- Created branch `prep/ark-production-reconciliation-20260920` from the tested candidate.
- Added the forward-only SQL bundle there for a single controlled production migration after the restore gate passes.
