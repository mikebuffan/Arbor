-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Requires research v1-v6 proposals first.
-- No fetch executor, scheduler, real-source ingestion or publication is enabled.

create table if not exists public.arbor_research_capture_authorizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  authorization_key text not null,
  source_uri text not null,
  expected_host text not null,
  source_authority text not null,
  source_class text not null check (source_class in (
    'official_government','court_record','legislative_release','other_public_record'
  )),
  max_bytes bigint not null check (max_bytes between 1 and 104857600),
  max_pages integer not null check (max_pages between 1 and 10000),
  max_wall_clock_ms integer not null check (max_wall_clock_ms between 1000 and 600000),
  redirect_hosts jsonb not null check (jsonb_typeof(redirect_hosts)='array'),
  human_authorization_ref text not null,
  status text not null default 'authorized_candidate_not_fetched',
  created_at timestamptz not null default now(),
  constraint arbor_research_capture_authorizations_owner_fk
    foreign key(project_id,owner_id) references public.projects(id,user_id) on delete cascade,
  unique(owner_id,project_id,authorization_key)
);

create table if not exists public.arbor_research_privacy_candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  candidate_key text not null,
  kind text not null check (kind in (
    'email','phone','street_address','account_identifier','passport_or_document','other_identifier'
  )),
  literal_value text not null,
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  related_entity_candidate_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(related_entity_candidate_ids)='array'),
  status text not null default 'hold_for_human_privacy_classification',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,candidate_key)
);

create table if not exists public.arbor_research_privacy_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  decision_key text not null,
  candidate_id uuid not null references public.arbor_research_privacy_candidates(id) on delete restrict,
  decision text not null check (decision in (
    'allow_public_record_identifier','withhold_private_identifier','escalate_sensitive_subject','not_pii'
  )),
  reviewer_ref text not null,
  rationale text not null,
  basis_evidence_refs jsonb not null check (jsonb_typeof(basis_evidence_refs)='array'),
  decided_at timestamptz not null,
  status text not null default 'human_privacy_decision',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,decision_key)
);

create table if not exists public.arbor_research_worker_liveness_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  receipt_key text not null,
  worker_id text not null,
  observed_at timestamptz not null,
  liveness_status text not null check (liveness_status in (
    'active_lease','recent_heartbeat_no_active_lease','expired_or_stale','unknown'
  )),
  last_heartbeat_at timestamptz,
  lease_expires_at timestamptz,
  claimed_unit_id text,
  source text not null default 'heartbeat_and_lease_only',
  created_at timestamptz not null default now(),
  constraint arbor_research_worker_liveness_owner_fk
    foreign key(project_id,owner_id) references public.projects(id,user_id) on delete cascade,
  unique(owner_id,project_id,receipt_key)
);

create table if not exists public.arbor_research_scheduler_state (
  owner_id uuid not null,
  project_id uuid not null,
  scheduler_key text not null,
  enabled boolean not null default false,
  cadence text,
  execution_target text,
  authorization_ref text,
  status text not null default 'disabled_explicit_authorization_required',
  updated_at timestamptz not null default now(),
  primary key(owner_id,project_id,scheduler_key),
  constraint arbor_research_scheduler_state_owner_fk
    foreign key(project_id,owner_id) references public.projects(id,user_id) on delete cascade,
  constraint arbor_research_scheduler_fail_closed
    check (
      enabled=false
      and cadence is null
      and execution_target is null
      and authorization_ref is null
      and status='disabled_explicit_authorization_required'
    )
);

alter table public.arbor_research_capture_authorizations enable row level security;
alter table public.arbor_research_privacy_candidates enable row level security;
alter table public.arbor_research_privacy_decisions enable row level security;
alter table public.arbor_research_worker_liveness_receipts enable row level security;
alter table public.arbor_research_scheduler_state enable row level security;

revoke all privileges on table
  public.arbor_research_capture_authorizations,
  public.arbor_research_privacy_candidates,
  public.arbor_research_privacy_decisions,
  public.arbor_research_worker_liveness_receipts,
  public.arbor_research_scheduler_state
from public, anon, authenticated;

grant all privileges on table
  public.arbor_research_capture_authorizations,
  public.arbor_research_privacy_candidates,
  public.arbor_research_privacy_decisions,
  public.arbor_research_worker_liveness_receipts,
  public.arbor_research_scheduler_state
to service_role;

grant select on table
  public.arbor_research_worker_liveness_receipts,
  public.arbor_research_scheduler_state
to authenticated;

create policy arbor_research_worker_liveness_owner_read
on public.arbor_research_worker_liveness_receipts
for select to authenticated
using ((select auth.uid())=owner_id);

create policy arbor_research_scheduler_state_owner_read
on public.arbor_research_scheduler_state
for select to authenticated
using ((select auth.uid())=owner_id);

drop trigger if exists arbor_research_capture_authorizations_append_only
on public.arbor_research_capture_authorizations;
create trigger arbor_research_capture_authorizations_append_only
before update or delete on public.arbor_research_capture_authorizations
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_privacy_candidates_append_only
on public.arbor_research_privacy_candidates;
create trigger arbor_research_privacy_candidates_append_only
before update or delete on public.arbor_research_privacy_candidates
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_privacy_decisions_append_only
on public.arbor_research_privacy_decisions;
create trigger arbor_research_privacy_decisions_append_only
before update or delete on public.arbor_research_privacy_decisions
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_worker_liveness_append_only
on public.arbor_research_worker_liveness_receipts;
create trigger arbor_research_worker_liveness_append_only
before update or delete on public.arbor_research_worker_liveness_receipts
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_capture_authorizations is
  'Bounded public-source capture authorization receipts. A receipt is not a fetch and does not request execution.';
comment on table public.arbor_research_privacy_candidates is
  'Literal PII/identifier candidates remain HOLD until an explicit human privacy decision.';
comment on table public.arbor_research_worker_liveness_receipts is
  'Worker liveness derives only from heartbeat/lease observations, never UI state alone.';
comment on table public.arbor_research_scheduler_state is
  'v7 scheduler state is structurally disabled and cannot contain a cadence or execution target.';
