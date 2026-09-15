-- Restore Arbor v1 phrase/entity repetition signal table on the current UUID schema.
-- Server-only write path; RLS remains enabled and no client policies are added.

create table if not exists public.ar_phrase_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  thread_id uuid null,
  message_id uuid null,
  phrase text not null,
  phrase_type text not null default 'ngram'
    check (phrase_type in ('ngram','entity','tag')),
  count_delta integer not null default 1
    check (count_delta > 0),
  created_at timestamptz not null default now()
);

create index if not exists ar_phrase_counts_lookup
  on public.ar_phrase_counts
  (user_id, project_id, phrase, created_at desc);

create index if not exists ar_phrase_counts_thread
  on public.ar_phrase_counts
  (user_id, project_id, thread_id, created_at desc);

create unique index if not exists ar_phrase_counts_message_phrase_unique
  on public.ar_phrase_counts
  (user_id, message_id, phrase, phrase_type)
  where message_id is not null;

alter table public.ar_phrase_counts enable row level security;

-- Deliberately no authenticated-client policy. This signal ledger is written
-- only from the server-side service-role boundary after user/project ownership
-- has already been established by the chat route.
