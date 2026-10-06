-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database. This is separate from read grants, runtime-goal
-- writes, correction writes and any general worker permission.

create table if not exists public.grove_private_ark_objective_run_grants (
  grove_user_id uuid not null references auth.users(id) on delete cascade,
  firefly_user_id uuid not null,
  firefly_project_id uuid not null,
  firefly_conversation_id uuid not null,
  ark_objective_id uuid not null,
  purpose text not null check (purpose = 'bounded_objective_execution'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (
    grove_user_id,
    firefly_user_id,
    firefly_project_id,
    firefly_conversation_id,
    ark_objective_id,
    purpose
  ),
  check (expires_at > created_at)
);

alter table public.grove_private_ark_objective_run_grants enable row level security;

-- No browser policy and no seed row. The dedicated broker must prove Grove
-- Auth, private-owner invitation, Firefly bridge, project grant, Firefly
-- ownership and exact conversation ownership before this service-role record
-- can authorize one exact objective. Current source additionally restricts
-- Grove execution to an existing single-task arbor.agency-tool objective.
