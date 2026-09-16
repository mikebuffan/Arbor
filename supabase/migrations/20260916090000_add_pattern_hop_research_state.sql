-- Persistent state for bounded, resumable Arbor research pattern-hopping.
create table if not exists public.arbor_pattern_hop_runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null, conversation_id uuid,
 objective text not null, seed jsonb not null default '{}'::jsonb,
 status text not null default 'active' check (status in ('active','complete','blocked','exhausted')),
 max_depth integer not null default 6 check (max_depth between 1 and 32),
 frontier jsonb not null default '[]'::jsonb, visited jsonb not null default '[]'::jsonb,
 exhausted_branches jsonb not null default '[]'::jsonb, completed_branches jsonb not null default '[]'::jsonb,
 blocker text, verification_state jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.arbor_pattern_hop_evidence (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.arbor_pattern_hop_runs(id) on delete cascade,
 user_id uuid not null, project_id uuid not null, source text not null, source_thread_id text, source_message_id text,
 source_artifact_id text, speaker text, evidence_type text not null, content text not null, occurred_at timestamptz,
 chronology_rank integer, confidence numeric not null default 0.5 check (confidence between 0 and 1),
 epistemic_status text not null default 'direct' check (epistemic_status in ('direct','derived','hypothesis','retrospective','contradictory')),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.arbor_pattern_hop_edges (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.arbor_pattern_hop_runs(id) on delete cascade,
 from_evidence_id uuid references public.arbor_pattern_hop_evidence(id) on delete cascade,
 to_evidence_id uuid not null references public.arbor_pattern_hop_evidence(id) on delete cascade,
 originating_clue text not null, relationship text not null, hop_depth integer not null check (hop_depth >= 0),
 confidence numeric not null default 0.5 check (confidence between 0 and 1),
 epistemic_status text not null default 'derived' check (epistemic_status in ('direct','derived','hypothesis')),
 rationale text not null, created_at timestamptz not null default now()
);
create unique index if not exists arbor_pattern_hop_evidence_source_unique on public.arbor_pattern_hop_evidence(run_id,source,coalesce(source_message_id,''),md5(content));
create index if not exists arbor_pattern_hop_runs_active_idx on public.arbor_pattern_hop_runs(user_id,project_id,status,updated_at desc);
create index if not exists arbor_pattern_hop_evidence_time_idx on public.arbor_pattern_hop_evidence(run_id,occurred_at,chronology_rank);
create index if not exists arbor_pattern_hop_edges_depth_idx on public.arbor_pattern_hop_edges(run_id,hop_depth);
alter table public.arbor_pattern_hop_runs enable row level security;
alter table public.arbor_pattern_hop_evidence enable row level security;
alter table public.arbor_pattern_hop_edges enable row level security;
