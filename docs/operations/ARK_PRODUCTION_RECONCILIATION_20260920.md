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

## Remaining hard gate

A verified restorable backup of original Firefly still has not been independently proven. The repaired local rehearsal script is preserved in the user's file library, but no successful restore report was available during this audit. Do not apply production DDL until the backup restore is verified.

## Safe next sequence after restore verification

1. Apply the forward-only bundle to original Firefly.
2. Verify ARK tables, RPC signatures, policies, owner constraints, and unchanged counts for projects/memories/conversations.
3. Merge/promote PR #115.
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
