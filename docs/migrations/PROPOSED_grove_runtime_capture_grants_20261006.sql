-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database. This permission allows only automatic capture of
-- the verified private text turn into the existing Firefly conversation-state
-- continuity fields. It grants no goal change, correction, ARK execution,
-- general memory write or transcript permission.

create table if not exists public.grove_private_runtime_capture_grants (
  grove_user_id uuid not null references auth.users(id) on delete cascade,
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
  check (expires_at > created_at)
);

alter table public.grove_private_runtime_capture_grants enable row level security;

-- No browser mutation policy and no seed row.
