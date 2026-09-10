create table if not exists public.arbor_runtime_state
(
  user_id uuid not null,
  project_id uuid not null,
  conversation_id uuid not null,

  state jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),

  primary key (
    user_id,
    project_id,
    conversation_id
  )
);

alter table public.arbor_runtime_state
enable row level security;

drop policy if exists
  "users manage own arbor runtime state"
on public.arbor_runtime_state;

create policy
  "users manage own arbor runtime state"
on public.arbor_runtime_state
for all
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

create index if not exists
  arbor_runtime_state_updated_at_idx
on public.arbor_runtime_state
(
  user_id,
  project_id,
  updated_at desc
);
