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
- GitHub verification on the exact prepared head must pass before this change can be marked release-ready; see the recovery checkpoint and latest linked runs below.

## 2026-09-20 final recovery checkpoint — original private backup now available for inspection

- The *real* original before-ARK SQL files were supplied privately for independent offline verification; do not upload them to this repository, GitHub Actions artifacts, a public URL, or ARK Preview.
- Original `roles.sql`, `schema.sql`, and `data.sql` match all three recorded SHA-256 manifest entries. The original data dump has 115 well-terminated COPY sections totaling 9,179 rows and zero detected field-count anomalies.
- Seven primary record-identity sets from the backup were compared read-only with original Firefly and matched. The snapshot records 5 projects, 3,687 memory items, 97 conversations, 259 messages, 2 runtime-state rows, 4 conversation-state rows and 3 Auth users.
- Offline source integrity checked 82 primary keys, 23 UNIQUE constraints, 94 foreign keys and the 11 separately declared unique indexes, including the three expression/partial indexes. This cannot substitute for real PostgreSQL constraint, extension and restore execution.
- Original dump Storage metadata: 1 bucket and **0 `storage.objects` rows**. PostgreSQL SQL dumps do not themselves contain Storage object payload bytes; other external file services are outside this backup.
- Static scan of the three original SQL files found no obvious transaction-incompatible command from the known set (CREATE/DROP DATABASE, VACUUM, CREATE INDEX CONCURRENTLY, ALTER SYSTEM, explicit BEGIN/COMMIT, or psql connect). This is *not* a claim that the restore can commit successfully.
- This assistant's current runtime contains neither PostgreSQL server/psql/initdb nor Docker and cannot reach the package mirror. No executable isolated restore was possible here. The original snapshot has **not** been copied into ARK Preview or CI.
- GitHub tested preparation head before this documentation update: `1b77dd16274c9ad1bec6deefee4cc0e5e666fc27`; exact six-migration production-shaped PostgreSQL17 [PASS](https://github.com/mikebuffan/Arbor/actions/runs/35525321656), full-stack backend/frontend/ARK migration/canary [PASS](https://github.com/mikebuffan/Arbor/actions/runs/35525321636). These synthetic release tests are distinct from the private-backup restore.
- Remaining single hard recovery gate: a successful **isolated actual-backup SQL restore**, verified post-commit with seven key row counts, on a privately controlled PostgreSQL/Supabase-compatible host. Preserve any successful existing local restore; do not reset it blindly. Upload only a privacy-scrubbed success report, not Auth sessions, refresh tokens or original SQL.
- Latest read-only original Firefly inspection still showed expected key counts and no `ark_objectives` or `arbor_work_jobs` installed. Neither PR #115 nor PR #117 was merged, no original Firefly DDL was executed, and execution flags were not enabled.

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
