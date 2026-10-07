# Pre-Vercel hosted schema preflight

Date: 2026-10-06
Mode: read-only hosted inspection only. No migration, DDL, grant, seed, worker activation, or data mutation was executed.

## Firefly ARK Preview

Project status: active/healthy, PostgreSQL 17.

### Pattern Hop run control

Current hosted state is cleanly **unapplied**, not partially applied:
- none of `stop_requested_at`, `run_lease_owner`, `run_lease_token`, `run_lease_expires_at`, or `control_version` exists on `public.arbor_pattern_hop_runs`;
- none of the proposed claim/heartbeat/release/STOP/resume control RPCs exists;
- the existing run table and baseline Pattern Hop migrations are present.

Compatibility verified read-only:
- `public.arbor_pattern_hop_runs` exists;
- `gen_random_uuid()` is available;
- authenticated owner-scoped SELECT and UPDATE RLS policies already exist using `auth.uid() = user_id`;
- the source proposal has been hardened to `SECURITY INVOKER`, preserving those policies instead of bypassing them;
- explicit JWT owner/project/run checks remain defense in depth;
- disposable PostgreSQL acceptance now impersonates the actual `authenticated` DB role and proves owner success / foreign denial.

### ARK durable STOP

Current hosted state is also cleanly unapplied:
- migration `20261007005500_add_ark_cancel_objective` is not in hosted migration history;
- `public.ark_cancel_objective` does not exist.

Compatibility verified read-only:
- `ark_objectives`, `ark_tasks`, and `ark_events` exist;
- objective and task status constraints already include `cancelled`;
- task lease owner/token/expiry/heartbeat/version/update columns required by STOP cleanup exist;
- objective blocker/version/update columns exist;
- event objective/type/payload columns exist.

No schema repair is needed before the proposed STOP migration can be reviewed for application.

## The Grove

Project status: active/healthy, PostgreSQL 17.

Current grant baseline:
- `public.grove_private_ark_project_grants` exists;
- primary key is exactly `(grove_user_id, firefly_project_id)`, matching the proposed child-table foreign keys;
- row level security is enabled **and forced**;
- anon/authenticated do not have SELECT; service role does.

The following proposal-only tables are cleanly absent:
- `grove_private_runtime_capture_grants`;
- `grove_private_runtime_goal_write_grants`;
- `grove_private_ark_objective_run_grants`.

Therefore there is no partial hosted application to clean up. The exact proposal files have already passed disposable PostgreSQL acceptance on the source lane; hosted application remains an explicit owner-approved gate.

## Result

Hosted database discovery is no longer a post-Vercel unknown. Once deployment authority is available, the remaining database work is intentionally narrow:
1. review the exact accepted migration/proposal hashes;
2. apply only with explicit approval;
3. run exact ownership/RLS/STOP/readback smoke checks;
4. keep worker/inference activation separate.

This preflight is evidence of compatibility only, not authorization to apply.
