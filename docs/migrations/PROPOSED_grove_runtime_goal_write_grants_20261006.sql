-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database, not Firefly/main.
begin;

create table if not exists public.grove_private_runtime_goal_write_grants (
  grove_user_id uuid not null,
  firefly_user_id uuid not null,
  firefly_project_id uuid not null,
  firefly_conversation_id uuid not null,
  purpose text not null check (purpose = 'conversation_runtime_goal'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (
    grove_user_id,
    firefly_user_id,
    firefly_project_id,
    firefly_conversation_id,
    purpose
  ),
  foreign key (grove_user_id, firefly_project_id)
    references public.grove_private_ark_project_grants(
      grove_user_id, firefly_project_id
    ) on delete cascade,
  check (expires_at > created_at)
);

alter table public.grove_private_runtime_goal_write_grants enable row level security;
alter table public.grove_private_runtime_goal_write_grants force row level security;

-- No browser policy and no seed row. The verified dedicated Grove broker reads
-- this table through its service role only after Grove Auth, owner invitation,
-- bridge, exact project grant, Firefly ownership and conversation ownership.
revoke all on table public.grove_private_runtime_goal_write_grants
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.grove_private_runtime_goal_write_grants to service_role;

comment on table public.grove_private_runtime_goal_write_grants is
  'Expiring exact-conversation permission to change only the existing runtime current goal. No client policy, no seeded grants, no correction/transcript/ARK/general-memory authority.';

commit;
