create table if not exists public.arbor_work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  problem_key text not null,
  status text not null check (
    status in (
      'open',
      'investigating',
      'repairing',
      'verifying',
      'resolved',
      'reverted',
      'blocked'
    )
  ),
  hypothesis text,
  hypothesis_confidence double precision check (
    hypothesis_confidence is null or
    (hypothesis_confidence >= 0 and hypothesis_confidence <= 1)
  ),
  current_goal text not null,
  next_action text,
  evidence jsonb not null default '[]'::jsonb,
  affected_subsystems jsonb not null default '[]'::jsonb,
  attempted_strategies jsonb not null default '[]'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  verification_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, problem_key)
);

create index if not exists arbor_work_items_active_idx
  on public.arbor_work_items (
    user_id,
    project_id,
    status,
    updated_at desc
  );

alter table public.arbor_work_items enable row level security;

drop policy if exists "users manage own arbor work items"
  on public.arbor_work_items;

create policy "users manage own arbor work items"
  on public.arbor_work_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
