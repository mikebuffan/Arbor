-- PROPOSAL ONLY. Disposable/source acceptance first.
-- Do NOT apply to Preview, production, or any real investigation database without separate approval.
-- Trusted observation/entity persistence for anomaly discovery.
-- Identity rule: unresolved names/mentions are never eligible to become discovery bridge nodes.

create table if not exists public.arbor_investigation_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  entity_ref text not null check (length(btrim(entity_ref)) between 1 and 1000),
  display_label text not null check (length(btrim(display_label)) between 1 and 2000),
  entity_kind text not null check (entity_kind in (
    'person','organization','company','address','property','aircraft',
    'phone','email','account','attorney','official','document_author','other'
  )),
  identity_status text not null check (identity_status in (
    'resolved','source_stable','unresolved','do_not_merge'
  )),
  identity_basis_refs text[] not null default '{}'
    check (cardinality(identity_basis_refs) <= 100),
  created_at timestamptz not null default now(),
  constraint arbor_investigation_entities_project_owner_fk
    foreign key (project_id,user_id)
    references public.projects(id,user_id) on delete cascade,
  constraint arbor_investigation_entities_identity_uniq
    unique (id,user_id,project_id),
  constraint arbor_investigation_entities_ref_uniq
    unique (user_id,project_id,entity_ref),
  constraint arbor_investigation_entities_resolved_basis_check check (
    identity_status not in ('resolved')
    or cardinality(identity_basis_refs) >= 1
  )
);

create table if not exists public.arbor_investigation_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  evidence_id uuid not null,
  document_family text not null
    check (length(btrim(document_family)) between 1 and 1000),
  occurred_at timestamptz,
  event_tags text[] not null default '{}'
    check (cardinality(event_tags) <= 100),
  created_at timestamptz not null default now(),
  constraint arbor_investigation_observations_project_owner_fk
    foreign key (project_id,user_id)
    references public.projects(id,user_id) on delete cascade,
  constraint arbor_investigation_observations_evidence_fk
    foreign key (evidence_id,user_id,project_id)
    references public.arbor_investigation_evidence(id,user_id,project_id)
    on delete cascade,
  constraint arbor_investigation_observations_identity_uniq
    unique (id,user_id,project_id),
  constraint arbor_investigation_observations_evidence_family_uniq
    unique (user_id,project_id,evidence_id,document_family)
);

create table if not exists public.arbor_investigation_observation_entities (
  observation_id uuid not null,
  entity_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (observation_id,entity_id),
  constraint arbor_investigation_observation_entities_observation_fk
    foreign key (observation_id,user_id,project_id)
    references public.arbor_investigation_observations(id,user_id,project_id)
    on delete cascade,
  constraint arbor_investigation_observation_entities_entity_fk
    foreign key (entity_id,user_id,project_id)
    references public.arbor_investigation_entities(id,user_id,project_id)
    on delete cascade
);

create index if not exists arbor_investigation_observations_evidence_idx
  on public.arbor_investigation_observations
  (user_id,project_id,evidence_id,occurred_at);

create index if not exists arbor_investigation_observation_entities_entity_idx
  on public.arbor_investigation_observation_entities
  (user_id,project_id,entity_id,observation_id);

create or replace function public.arbor_reject_investigation_discovery_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  raise exception 'investigation_discovery_records_are_append_only';
end
$fn$;

do $block$
declare rel text;
begin
  foreach rel in array array[
    'arbor_investigation_entities',
    'arbor_investigation_observations',
    'arbor_investigation_observation_entities'
  ] loop
    execute format(
      'drop trigger if exists %I on public.%I',
      rel || '_immutable',
      rel
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.arbor_reject_investigation_discovery_mutation()',
      rel || '_immutable',
      rel
    );
  end loop;
end
$block$;

alter table public.arbor_investigation_entities enable row level security;
alter table public.arbor_investigation_observations enable row level security;
alter table public.arbor_investigation_observation_entities enable row level security;

revoke all on public.arbor_investigation_entities from anon,authenticated,service_role;
revoke all on public.arbor_investigation_observations from anon,authenticated,service_role;
revoke all on public.arbor_investigation_observation_entities from anon,authenticated,service_role;

grant select on public.arbor_investigation_entities to authenticated;
grant select on public.arbor_investigation_observations to authenticated;
grant select on public.arbor_investigation_observation_entities to authenticated;

grant select,insert on public.arbor_investigation_entities to service_role;
grant select,insert on public.arbor_investigation_observations to service_role;
grant select,insert on public.arbor_investigation_observation_entities to service_role;

drop policy if exists arbor_investigation_entities_owner_read
  on public.arbor_investigation_entities;
create policy arbor_investigation_entities_owner_read
  on public.arbor_investigation_entities
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists arbor_investigation_observations_owner_read
  on public.arbor_investigation_observations;
create policy arbor_investigation_observations_owner_read
  on public.arbor_investigation_observations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists arbor_investigation_observation_entities_owner_read
  on public.arbor_investigation_observation_entities;
create policy arbor_investigation_observation_entities_owner_read
  on public.arbor_investigation_observation_entities
  for select to authenticated
  using (user_id = auth.uid());

-- Trusted discovery loader. It returns only resolved or source-stable entities.
-- Unresolved/do-not-merge mentions remain persisted for later identity work but
-- cannot silently become bridge nodes.
create or replace function public.arbor_load_investigation_observations(
  p_evidence_ids uuid[],
  p_user_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare result jsonb;
begin
  if p_user_id is null or p_project_id is null
     or p_evidence_ids is null
     or cardinality(p_evidence_ids) < 1
     or cardinality(p_evidence_ids) > 100 then
    raise exception 'investigation_observation_loader_invalid_scope';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'evidenceRef', e.id::text,
        'lineageKey', e.lineage_key,
        'documentFamily', o.document_family,
        'occurredAt', o.occurred_at,
        'eventTags', to_jsonb(o.event_tags),
        'entities', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ent.entity_ref,
              'label', ent.display_label,
              'kind', ent.entity_kind
            )
            order by ent.entity_ref
          )
          from public.arbor_investigation_observation_entities oe
          join public.arbor_investigation_entities ent
            on ent.id=oe.entity_id
           and ent.user_id=oe.user_id
           and ent.project_id=oe.project_id
          where oe.observation_id=o.id
            and oe.user_id=p_user_id
            and oe.project_id=p_project_id
            and ent.identity_status in ('resolved','source_stable')
        ), '[]'::jsonb)
      )
      order by o.created_at,o.id
    ),
    '[]'::jsonb
  )
  into result
  from public.arbor_investigation_observations o
  join public.arbor_investigation_evidence e
    on e.id=o.evidence_id
   and e.user_id=o.user_id
   and e.project_id=o.project_id
  where o.user_id=p_user_id
    and o.project_id=p_project_id
    and o.evidence_id=any(p_evidence_ids);

  return result;
end
$fn$;

revoke all on function public.arbor_load_investigation_observations(
  uuid[],uuid,uuid
) from public,anon,authenticated;
grant execute on function public.arbor_load_investigation_observations(
  uuid[],uuid,uuid
) to service_role;
