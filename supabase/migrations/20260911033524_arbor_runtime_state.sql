create table if not exists public.arbor_conversation_state
(
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  conversation_id uuid not null,

  state jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),

  primary key (
    user_id,
    project_id,
    conversation_id
  )
);

alter table public.arbor_conversation_state
enable row level security;

drop policy if exists
  "conversation_state_select_own"
on public.arbor_conversation_state;

drop policy if exists
  "conversation_state_insert_own"
on public.arbor_conversation_state;

drop policy if exists
  "conversation_state_update_own"
on public.arbor_conversation_state;

create policy
  "conversation_state_select_own"
on public.arbor_conversation_state
for select
using (
  auth.uid() = user_id
);

create policy
  "conversation_state_insert_own"
on public.arbor_conversation_state
for insert
with check (
  auth.uid() = user_id
);

create policy
  "conversation_state_update_own"
on public.arbor_conversation_state
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

create index if not exists
  arbor_conversation_state_updated_at_idx
on public.arbor_conversation_state
(
  user_id,
  project_id,
  updated_at desc
);
