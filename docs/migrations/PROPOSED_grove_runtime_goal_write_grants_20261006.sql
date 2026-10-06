-- PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Dedicated Grove database, not Firefly/main.

create table if not exists public.grove_private_runtime_goal_write_grants (
  grove_user_id uuid not null references auth.users(id) on delete cascade,
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
  check (expires_at > created_at)
);

alter table public.grove_private_runtime_goal_write_grants enable row level security;

-- No browser mutation policy is created here. The verified dedicated Grove
-- broker reads this table through its service role after Grove Auth, owner,
-- bridge, project grant, Firefly project ownership and conversation ownership
-- have all passed. This proposal seeds no grants.
