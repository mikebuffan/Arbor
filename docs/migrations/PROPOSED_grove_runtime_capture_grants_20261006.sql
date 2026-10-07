-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database. This permission allows only automatic capture of
-- the verified private text turn into the existing Firefly conversation-state
-- continuity fields. It grants no goal change, correction, ARK execution,
-- general memory write or transcript permission.
begin;

create table if not exists public.grove_private_runtime_capture_grants (
  grove_user_id uuid not null,
  firefly_user_id uuid not null,
  firefly_project_id uuid not null,
  firefly_conversation_id uuid not null,
  purpose text not null check (purpose = 'conversation_runtime_capture'),
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

alter table public.grove_private_runtime_capture_grants enable row level security;
alter table public.grove_private_runtime_capture_grants force row level security;

-- No browser policy and no seed row. Only the dedicated Grove service role may
-- inspect or mutate this permission after the verified broker has rechecked
-- Grove Auth, owner invitation, bridge, project grant and exact conversation.
revoke all on table public.grove_private_runtime_capture_grants
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.grove_private_runtime_capture_grants to service_role;

comment on table public.grove_private_runtime_capture_grants is
  'Expiring exact-conversation permission for verified Grove runtime turn capture only. No client policy, no seeded grants, no goal/correction/ARK/general-memory authority.';

commit;
