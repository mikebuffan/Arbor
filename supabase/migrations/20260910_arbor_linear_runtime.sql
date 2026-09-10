create table if not exists public.arbor_runtime_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  active_subsystem text not null default 'arbor'
    check (active_subsystem in ('arbor', 'annabelle')),
  voice_id text not null default 'cedar',
  acoustic_corrections jsonb not null default '[]'::jsonb,
  agency_goal text null,
  agency_status text null
    check (agency_status is null or agency_status in ('active', 'complete', 'blocked')),
  agency_current_step integer not null default 0,
  agency_unresolved_work jsonb not null default '[]'::jsonb,
  agency_recurring_weaknesses jsonb not null default '[]'::jsonb,
  agency_strategy_notes jsonb not null default '[]'::jsonb,
  agency_blocker text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table if not exists public.arbor_timeline_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid null,
  turn_id uuid not null,
  sequence integer not null,
  phase text not null,
  event_type text not null,
  subsystem text not null check (subsystem in ('arbor', 'annabelle')),
  channel text not null check (channel in ('text', 'voice')),
  action_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (turn_id, sequence)
);

create index if not exists arbor_timeline_turn_idx
  on public.arbor_timeline_events (turn_id, sequence);

create index if not exists arbor_timeline_project_idx
  on public.arbor_timeline_events (user_id, project_id, created_at desc);

alter table public.arbor_runtime_state enable row level security;
alter table public.arbor_timeline_events enable row level security;

create policy "runtime_state_select_own"
on public.arbor_runtime_state for select
using (auth.uid() = user_id);

create policy "runtime_state_insert_own"
on public.arbor_runtime_state for insert
with check (auth.uid() = user_id);

create policy "runtime_state_update_own"
on public.arbor_runtime_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "timeline_select_own"
on public.arbor_timeline_events for select
using (auth.uid() = user_id);

create policy "timeline_insert_own"
on public.arbor_timeline_events for insert
with check (auth.uid() = user_id);
