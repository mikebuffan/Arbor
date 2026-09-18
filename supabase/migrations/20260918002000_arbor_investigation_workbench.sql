-- Durable investigation workbench state for evidence-grade corpus research.
-- This layer is deliberately separate from Pattern Hop internals.

create table if not exists public.arbor_investigation_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  objective text not null,
  status text not null default 'active'
    check (status in ('active','frozen','complete','blocked')),
  schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, name)
);

create table if not exists public.arbor_investigation_sources (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id text not null,
  source_family_id text not null,
  original_source text not null,
  acquisition_method text not null,
  acquired_at timestamptz not null,
  content_hash text not null,
  file_family_hash text,
  origin_id text,
  duplicate_of_source_id text,
  derived_from_source_ids jsonb not null default '[]'::jsonb,
  independence_status text not null default 'unknown'
    check (independence_status in ('unknown','duplicate','shared_origin','derived','independent')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (case_id, source_id)
);

create table if not exists public.arbor_investigation_evidence_packets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_id text not null,
  document_id text not null,
  source_id text not null,
  source_family_id text not null,
  atomic_claim text not null,
  evidence_kind text not null
    check (evidence_kind in ('fact','allegation','inference')),
  confidence numeric not null check (confidence between 0 and 1),
  entity_resolution_state jsonb not null default '[]'::jsonb,
  counterevidence_state jsonb not null default '[]'::jsonb,
  source_independence text not null default 'unknown'
    check (source_independence in ('unknown','duplicate','shared_origin','derived','independent')),
  locator jsonb not null,
  provenance jsonb not null,
  temporal_state jsonb not null,
  context jsonb not null default '{}'::jsonb,
  hop_history jsonb not null default '[]'::jsonb,
  active_objective text not null,
  packet jsonb not null,
  created_at timestamptz not null default now(),
  unique (case_id, evidence_id)
);

create table if not exists public.arbor_investigation_claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  claim_id text not null,
  claim_text text not null,
  claim_kind text not null
    check (claim_kind in ('fact','allegation','inference')),
  created_at timestamptz not null default now(),
  unique (case_id, claim_id)
);

create table if not exists public.arbor_investigation_edges (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  from_id text not null,
  to_id text not null,
  relation text not null
    check (relation in (
      'supports','contradicts','qualifies','derived_from',
      'independent_of','same_source_family','temporal_context','causal_context'
    )),
  created_at timestamptz not null default now()
);

create table if not exists public.arbor_investigation_coverage (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scope_id text not null,
  description text not null,
  status text not null
    check (status in ('not_searched','searched','partial','exhausted')),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  unique (case_id, scope_id)
);

create table if not exists public.arbor_investigation_hypotheses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  hypothesis_id text not null,
  statement text not null,
  status text not null
    check (status in ('open','weakened','strengthened','rejected')),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  unique (case_id, hypothesis_id)
);

create table if not exists public.arbor_investigation_findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.arbor_investigation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  finding_id text not null,
  version integer not null check (version >= 1),
  status text not null check (status in ('current','superseded','withdrawn')),
  statement text not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  counterevidence_ids jsonb not null default '[]'::jsonb,
  entity_state text not null
    check (entity_state in ('unresolved','ambiguous','probable','confirmed')),
  confidence numeric not null check (confidence between 0 and 1),
  uncertainty jsonb not null default '[]'::jsonb,
  supersedes_version integer,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (case_id, finding_id, version)
);

create index if not exists arbor_investigation_cases_active_idx
  on public.arbor_investigation_cases (user_id, project_id, status, updated_at desc);
create index if not exists arbor_investigation_sources_family_idx
  on public.arbor_investigation_sources (case_id, source_family_id);
create index if not exists arbor_investigation_sources_hash_idx
  on public.arbor_investigation_sources (case_id, content_hash);
create index if not exists arbor_investigation_evidence_document_idx
  on public.arbor_investigation_evidence_packets (case_id, document_id);
create index if not exists arbor_investigation_evidence_source_idx
  on public.arbor_investigation_evidence_packets (case_id, source_id, source_family_id);
create index if not exists arbor_investigation_edges_to_idx
  on public.arbor_investigation_edges (case_id, to_id, relation);
create index if not exists arbor_investigation_findings_current_idx
  on public.arbor_investigation_findings (case_id, finding_id, status, version desc);

alter table public.arbor_investigation_cases enable row level security;
alter table public.arbor_investigation_sources enable row level security;
alter table public.arbor_investigation_evidence_packets enable row level security;
alter table public.arbor_investigation_claims enable row level security;
alter table public.arbor_investigation_edges enable row level security;
alter table public.arbor_investigation_coverage enable row level security;
alter table public.arbor_investigation_hypotheses enable row level security;
alter table public.arbor_investigation_findings enable row level security;

grant select, insert, update, delete on public.arbor_investigation_cases to authenticated;
grant select, insert, update, delete on public.arbor_investigation_sources to authenticated;
grant select, insert, update, delete on public.arbor_investigation_evidence_packets to authenticated;
grant select, insert, update, delete on public.arbor_investigation_claims to authenticated;
grant select, insert, update, delete on public.arbor_investigation_edges to authenticated;
grant select, insert, update, delete on public.arbor_investigation_coverage to authenticated;
grant select, insert, update, delete on public.arbor_investigation_hypotheses to authenticated;
grant select, insert, update, delete on public.arbor_investigation_findings to authenticated;

-- Chain-of-custody packets are append-only. Corrections create a new packet.
create or replace function public.arbor_reject_investigation_packet_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'investigation evidence packets are immutable; append a corrected packet';
end;
$$;

drop trigger if exists arbor_investigation_evidence_packets_immutable
  on public.arbor_investigation_evidence_packets;
create trigger arbor_investigation_evidence_packets_immutable
before update or delete on public.arbor_investigation_evidence_packets
for each row execute function public.arbor_reject_investigation_packet_mutation();

-- Finding content is immutable. Only lifecycle status may move forward.
create or replace function public.arbor_guard_investigation_finding_update()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'investigation findings are immutable';
  end if;

  if (
    new.case_id is distinct from old.case_id or
    new.user_id is distinct from old.user_id or
    new.project_id is distinct from old.project_id or
    new.finding_id is distinct from old.finding_id or
    new.version is distinct from old.version or
    new.statement is distinct from old.statement or
    new.evidence_ids is distinct from old.evidence_ids or
    new.counterevidence_ids is distinct from old.counterevidence_ids or
    new.entity_state is distinct from old.entity_state or
    new.confidence is distinct from old.confidence or
    new.uncertainty is distinct from old.uncertainty or
    new.supersedes_version is distinct from old.supersedes_version or
    new.snapshot is distinct from old.snapshot or
    new.created_at is distinct from old.created_at
  ) then
    raise exception 'finding snapshot content is immutable';
  end if;

  if old.status <> 'current' or new.status not in ('superseded','withdrawn') then
    raise exception 'invalid finding lifecycle transition';
  end if;

  return new;
end;
$$;

drop trigger if exists arbor_investigation_findings_guard
  on public.arbor_investigation_findings;
create trigger arbor_investigation_findings_guard
before update or delete on public.arbor_investigation_findings
for each row execute function public.arbor_guard_investigation_finding_update();

-- Case ownership is checked at both the row and parent-case boundary. Merely
-- knowing another case UUID cannot be used to attach rows to it.
drop policy if exists arbor_investigation_cases_select_own on public.arbor_investigation_cases;
create policy arbor_investigation_cases_select_own
on public.arbor_investigation_cases for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists arbor_investigation_cases_insert_own on public.arbor_investigation_cases;
create policy arbor_investigation_cases_insert_own
on public.arbor_investigation_cases for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists arbor_investigation_cases_update_own on public.arbor_investigation_cases;
create policy arbor_investigation_cases_update_own
on public.arbor_investigation_cases for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists arbor_investigation_cases_delete_own on public.arbor_investigation_cases;
create policy arbor_investigation_cases_delete_own
on public.arbor_investigation_cases for delete to authenticated
using ((select auth.uid()) = user_id);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'arbor_investigation_sources',
    'arbor_investigation_evidence_packets',
    'arbor_investigation_claims',
    'arbor_investigation_edges',
    'arbor_investigation_coverage',
    'arbor_investigation_hypotheses',
    'arbor_investigation_findings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.arbor_investigation_cases c where c.id = public.%I.case_id and c.user_id = (select auth.uid()) and c.project_id = public.%I.project_id))',
      tbl || '_select_own', tbl, tbl, tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.arbor_investigation_cases c where c.id = public.%I.case_id and c.user_id = (select auth.uid()) and c.project_id = public.%I.project_id))',
      tbl || '_insert_own', tbl, tbl, tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.arbor_investigation_cases c where c.id = public.%I.case_id and c.user_id = (select auth.uid()) and c.project_id = public.%I.project_id)) with check ((select auth.uid()) = user_id and exists (select 1 from public.arbor_investigation_cases c where c.id = public.%I.case_id and c.user_id = (select auth.uid()) and c.project_id = public.%I.project_id))',
      tbl || '_update_own', tbl, tbl, tbl, tbl, tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.arbor_investigation_cases c where c.id = public.%I.case_id and c.user_id = (select auth.uid()) and c.project_id = public.%I.project_id))',
      tbl || '_delete_own', tbl, tbl, tbl
    );
  end loop;
end $$;
