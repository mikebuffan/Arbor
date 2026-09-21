-- PROPOSAL ONLY. Apply solely to a newly provisioned, isolated public-alpha Supabase project.
-- Do not execute on Firefly or Firefly ARK Preview.
-- Public alpha tables deliberately have NO direct client policies or grants:
-- only the backend's service-role client can read/write, after verified JWT + allowlist.

create table if not exists public.public_app_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation'
    check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.public_app_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.public_app_conversations(id, user_id) on delete cascade,
  unique (user_id, turn_id, role)
);

create index if not exists public_app_conversations_owner_recent
  on public.public_app_conversations(user_id, updated_at desc);
create index if not exists public_app_messages_owner_thread
  on public.public_app_messages(user_id, conversation_id, created_at, id);
create index if not exists public_app_messages_owner_created
  on public.public_app_messages(user_id, created_at desc);

alter table public.public_app_conversations enable row level security;
alter table public.public_app_messages enable row level security;

-- NO policies means normal anon/authenticated callers cannot see the data.
-- Revoke the legacy project's broad table defaults as defense in depth.
revoke all on table public.public_app_conversations from anon, authenticated;
revoke all on table public.public_app_messages from anon, authenticated;

comment on table public.public_app_conversations is
  'Isolated public-app conversation data. Never copy from the private Grove.';
comment on table public.public_app_messages is
  'Isolated public-app turns; composite FK prohibits mismatched user ownership.';
