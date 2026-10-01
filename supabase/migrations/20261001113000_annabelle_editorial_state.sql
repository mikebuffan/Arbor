-- Durable, project-scoped Annabelle editorial state.
-- This extends the existing Annabelle workspace; it does not create a second Arbor identity.
create table if not exists public.annabelle_manuscripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  source_label text not null,
  source_sha256 text not null,
  status text not null default 'reference' check (status in ('reference','canonical','superseded','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id, source_sha256)
);

create table if not exists public.annabelle_chapters (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.annabelle_manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  label text,
  source_sha256 text not null,
  word_count integer not null default 0 check (word_count >= 0),
  source_locator jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(manuscript_id, chapter_number)
);

create table if not exists public.annabelle_editorial_records (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.annabelle_manuscripts(id) on delete cascade,
  chapter_id uuid references public.annabelle_chapters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  record_type text not null check (record_type in (
    'reader_reaction','editor_note','voice_evidence','gold_exemplar','canon',
    'character_state','relationship_state','knowledge_state','timeline',
    'thread_payoff','motif','physicality','location','injury_recovery',
    'problem','decision','do_not_touch','production_artifact','duplicate',
    'contradiction','impact'
  )),
  subject text,
  content jsonb not null,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  epistemic_status text not null default 'observed' check (epistemic_status in (
    'observed','probable','confirmed','hypothesis','contradictory','rejected'
  )),
  source_locator jsonb not null default '{}'::jsonb,
  source_sha256 text,
  supersedes_id uuid references public.annabelle_editorial_records(id),
  created_at timestamptz not null default now()
);

create table if not exists public.annabelle_editorial_checkpoints (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  manuscript_id uuid not null references public.annabelle_manuscripts(id) on delete cascade,
  pass_type text not null check (pass_type in ('diagnostic','continuous','editing','proof','voice_integrity')),
  chapter_number integer not null default 0 check (chapter_number >= 0),
  status text not null default 'ready' check (status in ('ready','in_progress','checkpointed','complete','blocked')),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id, manuscript_id, pass_type)
);

create table if not exists public.annabelle_editorial_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  manuscript_id uuid references public.annabelle_manuscripts(id) on delete cascade,
  chapter_id uuid references public.annabelle_chapters(id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists annabelle_records_lookup_idx
  on public.annabelle_editorial_records(user_id, project_id, manuscript_id, record_type, chapter_id, created_at);
create index if not exists annabelle_records_subject_idx
  on public.annabelle_editorial_records(user_id, project_id, manuscript_id, subject, record_type);
create index if not exists annabelle_events_recent_idx
  on public.annabelle_editorial_events(user_id, project_id, manuscript_id, created_at desc);

alter table public.annabelle_manuscripts enable row level security;
alter table public.annabelle_chapters enable row level security;
alter table public.annabelle_editorial_records enable row level security;
alter table public.annabelle_editorial_checkpoints enable row level security;
alter table public.annabelle_editorial_events enable row level security;

-- Match Arbor's existing user-scoped RLS while additionally requiring project ownership.
do $$ declare t text; begin
  foreach t in array array[
    'annabelle_manuscripts','annabelle_chapters','annabelle_editorial_records',
    'annabelle_editorial_checkpoints','annabelle_editorial_events'
  ] loop
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t || '_update_own', t);
  end loop;
end $$;
