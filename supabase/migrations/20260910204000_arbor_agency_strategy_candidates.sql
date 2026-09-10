create table if not exists public.arbor_agency_strategy_candidates (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  strategy text not null,
  success_count integer not null default 0,
  failure_count integer not null default 0,

  status text not null default 'candidate'
    check (status in ('candidate', 'retained', 'reverted')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, project_id, strategy)
);

alter table
  public.arbor_agency_strategy_candidates
enable row level security;

create policy "agency_strategy_candidates_select_own"
on public.arbor_agency_strategy_candidates
for select
using (auth.uid() = user_id);

create policy "agency_strategy_candidates_insert_own"
on public.arbor_agency_strategy_candidates
for insert
with check (auth.uid() = user_id);

create policy "agency_strategy_candidates_update_own"
on public.arbor_agency_strategy_candidates
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
