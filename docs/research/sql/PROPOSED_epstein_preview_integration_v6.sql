-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Apply only after v1-v5 proposals in a reviewed PREVIEW environment.
-- This schema deliberately creates no scheduler and enables no execution.

create table if not exists public.arbor_research_integration_state (
  owner_id uuid not null,
  project_id uuid not null,
  execution_enabled boolean not null default false,
  scheduler_enabled boolean not null default false,
  real_source_ingestion_enabled boolean not null default false,
  publication_enabled boolean not null default false,
  schema_version text not null default 'v6-preview',
  updated_at timestamptz not null default now(),
  primary key(owner_id,project_id),
  constraint arbor_research_integration_state_owner_fk
    foreign key(project_id,owner_id) references public.projects(id,user_id) on delete cascade,
  constraint arbor_research_integration_state_fail_closed
    check (
      execution_enabled = false
      and scheduler_enabled = false
      and real_source_ingestion_enabled = false
      and publication_enabled = false
    )
);

create table if not exists public.arbor_research_session_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  handoff_key text not null,
  from_session_id uuid not null,
  to_session_id uuid not null,
  reason text not null,
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs)='array'),
  created_at timestamptz not null default now(),
  status text not null default 'recorded_no_execution',
  constraint arbor_research_handoff_from_fk
    foreign key(from_session_id,owner_id,project_id)
    references public.arbor_research_sessions(id,user_id,project_id) on delete restrict,
  constraint arbor_research_handoff_to_fk
    foreign key(to_session_id,owner_id,project_id)
    references public.arbor_research_sessions(id,user_id,project_id) on delete restrict,
  constraint arbor_research_handoff_distinct_sessions check (from_session_id <> to_session_id),
  constraint arbor_research_handoff_unique unique(owner_id,project_id,handoff_key)
);

alter table public.arbor_research_integration_state enable row level security;
alter table public.arbor_research_session_handoffs enable row level security;

revoke all privileges on table
  public.arbor_research_integration_state,
  public.arbor_research_session_handoffs
from public, anon, authenticated;

grant all privileges on table
  public.arbor_research_integration_state,
  public.arbor_research_session_handoffs
to service_role;

grant select on table
  public.arbor_research_integration_state,
  public.arbor_research_session_handoffs
to authenticated;

create policy arbor_research_integration_state_owner_read
on public.arbor_research_integration_state
for select to authenticated
using ((select auth.uid()) = owner_id);

create policy arbor_research_session_handoffs_owner_read
on public.arbor_research_session_handoffs
for select to authenticated
using ((select auth.uid()) = owner_id);

drop trigger if exists arbor_research_session_handoffs_append_only
on public.arbor_research_session_handoffs;
create trigger arbor_research_session_handoffs_append_only
before update or delete on public.arbor_research_session_handoffs
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_integration_state is
  'Preview integration fail-closed state. v6 proposal cannot enable execution, scheduler, real-source ingestion or publication.';
comment on table public.arbor_research_session_handoffs is
  'Append-only same-owner/project research session continuity receipts; handoff does not start execution.';
