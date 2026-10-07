-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database. This is separate from read grants, runtime-goal
-- writes, correction writes and any general worker permission.
begin;

create table if not exists public.grove_private_ark_objective_run_grants (
  grove_user_id uuid not null,
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
  foreign key (grove_user_id, firefly_project_id)
    references public.grove_private_ark_project_grants(
      grove_user_id, firefly_project_id
    ) on delete cascade,
  check (expires_at > created_at)
);

alter table public.grove_private_ark_objective_run_grants enable row level security;
alter table public.grove_private_ark_objective_run_grants force row level security;

-- No browser policy and no seed row. Only the dedicated Grove service role may
-- inspect or mutate this permission after the broker has proved Grove Auth,
-- owner invitation, bridge, exact project grant, Firefly ownership and exact
-- conversation ownership.
revoke all on table public.grove_private_ark_objective_run_grants
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.grove_private_ark_objective_run_grants to service_role;

comment on table public.grove_private_ark_objective_run_grants is
  'Expiring exact-conversation and exact-objective permission for bounded Grove-triggered ARK execution only. No client policy, no seeded grants, no runtime-goal/correction/transcript/general-worker authority.';

-- Current source additionally restricts Grove execution to an existing
-- single-task arbor.agency-tool objective and rechecks authorization before
-- and after execution.
commit;
