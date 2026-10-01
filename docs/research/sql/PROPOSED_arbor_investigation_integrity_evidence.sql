-- PROPOSAL ONLY. Disposable/source acceptance first.
-- Do NOT apply to Preview, production, or any real investigation database without separate approval.
-- Immutable owner/project-scoped evidence + claim context for the Investigation Integrity Layer.

create table if not exists public.arbor_investigation_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  source_ref text not null check (length(btrim(source_ref)) between 1 and 1000),
  evidence_class text not null check (evidence_class in (
    'PRIMARY_RECORD','DIRECT_RECORDING','SWORN_FIRSTHAND',
    'ATTRIBUTED_STATEMENT','SECONDHAND_STATEMENT','MEDIA_SUMMARY',
    'PROCEDURAL_LITIGATION_POSITION','ALLEGATION','INFERENCE'
  )),
  lineage_key text not null check (length(btrim(lineage_key)) between 1 and 1000),
  content text not null check (length(btrim(content)) between 1 and 1000000),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  supports text[] not null check (
    cardinality(supports) between 1 and 8
    and supports <@ array[
      'direct_confession','direct_admission','established_act',
      'attributed_statement','procedural_position','relationship',
      'inference','absence'
    ]::text[]
  ),
  underlying_source_ref text,
  created_at timestamptz not null default now(),
  constraint arbor_investigation_evidence_project_owner_fk
    foreign key (project_id,user_id)
    references public.projects(id,user_id) on delete cascade,
  constraint arbor_investigation_evidence_identity_uniq
    unique (id,user_id,project_id),
  constraint arbor_investigation_evidence_source_content_uniq
    unique (user_id,project_id,source_ref,content_sha256)
);

create table if not exists public.arbor_investigation_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  claim_text text not null check (length(btrim(claim_text)) between 1 and 100000),
  assertion_kind text not null check (assertion_kind in (
    'direct_confession','direct_admission','established_act',
    'attributed_statement','procedural_position','relationship',
    'inference','absence'
  )),
  negative_evidence_state text check (
    negative_evidence_state is null or negative_evidence_state in (
      'NOT_FOUND_IN_SEARCHED_SCOPE','SOURCE_SILENT',
      'EXPECTED_BUT_MISSING','PROVEN_ABSENT'
    )
  ),
  negative_evidence_scope text,
  negative_evidence_proof_ref text,
  supersedes_claim_id uuid,
  created_at timestamptz not null default now(),
  constraint arbor_investigation_claims_project_owner_fk
    foreign key (project_id,user_id)
    references public.projects(id,user_id) on delete cascade,
  constraint arbor_investigation_claims_identity_uniq
    unique (id,user_id,project_id),
  constraint arbor_investigation_claim_negative_state_check check (
    (negative_evidence_state is null and negative_evidence_scope is null
      and negative_evidence_proof_ref is null)
    or
    (negative_evidence_state is not null
      and negative_evidence_scope is not null
      and length(btrim(negative_evidence_scope)) between 1 and 10000
      and (
        negative_evidence_state <> 'PROVEN_ABSENT'
        or (negative_evidence_proof_ref is not null
          and length(btrim(negative_evidence_proof_ref)) between 1 and 1000)
      ))
  )
);

alter table public.arbor_investigation_claims
  drop constraint if exists arbor_investigation_claims_supersedes_fk;
alter table public.arbor_investigation_claims
  add constraint arbor_investigation_claims_supersedes_fk
  foreign key (supersedes_claim_id,user_id,project_id)
  references public.arbor_investigation_claims(id,user_id,project_id);

create table if not exists public.arbor_investigation_claim_evidence (
  claim_id uuid not null,
  evidence_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  role text not null check (role in ('support','counter')),
  created_at timestamptz not null default now(),
  primary key (claim_id,evidence_id,role),
  constraint arbor_investigation_claim_evidence_claim_fk
    foreign key (claim_id,user_id,project_id)
    references public.arbor_investigation_claims(id,user_id,project_id) on delete cascade,
  constraint arbor_investigation_claim_evidence_evidence_fk
    foreign key (evidence_id,user_id,project_id)
    references public.arbor_investigation_evidence(id,user_id,project_id) on delete cascade
);

create table if not exists public.arbor_investigation_contradiction_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  contradiction_key text not null
    check (length(btrim(contradiction_key)) between 1 and 1000),
  state text not null check (state in ('open','resolved')),
  rationale text not null check (length(btrim(rationale)) between 1 and 10000),
  evidence_refs text[] not null default '{}'
    check (cardinality(evidence_refs) <= 100),
  created_at timestamptz not null default now(),
  constraint arbor_investigation_contradiction_claim_fk
    foreign key (claim_id,user_id,project_id)
    references public.arbor_investigation_claims(id,user_id,project_id) on delete cascade
);
create index if not exists arbor_investigation_contradiction_latest_idx
  on public.arbor_investigation_contradiction_events
  (claim_id,contradiction_key,created_at desc,id desc);

create table if not exists public.arbor_investigation_falsification_attempts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  hypothesis text not null check (length(btrim(hypothesis)) between 1 and 10000),
  result text not null check (result in ('claim_survived','claim_failed','inconclusive')),
  evidence_refs text[] not null default '{}'
    check (cardinality(evidence_refs) <= 100),
  created_at timestamptz not null default now(),
  constraint arbor_investigation_falsification_claim_fk
    foreign key (claim_id,user_id,project_id)
    references public.arbor_investigation_claims(id,user_id,project_id) on delete cascade
);

create or replace function public.arbor_reject_investigation_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $
begin
  raise exception 'investigation_records_are_append_only';
end $;

-- UPDATE is blocked even for privileged writers. DELETE is not trigger-blocked so
-- owner/account erasure cascades remain possible; ordinary service/client roles
-- receive no DELETE grant.

do $$
declare rel text;
begin
  foreach rel in array array[
    'arbor_investigation_evidence',
    'arbor_investigation_claims',
    'arbor_investigation_claim_evidence',
    'arbor_investigation_contradiction_events',
    'arbor_investigation_falsification_attempts'
  ] loop
    execute format('drop trigger if exists %I on public.%I',
      rel || '_immutable', rel);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.arbor_reject_investigation_mutation()',
      rel || '_immutable', rel
    );
  end loop;
end $$;

alter table public.arbor_investigation_evidence enable row level security;
alter table public.arbor_investigation_claims enable row level security;
alter table public.arbor_investigation_claim_evidence enable row level security;
alter table public.arbor_investigation_contradiction_events enable row level security;
alter table public.arbor_investigation_falsification_attempts enable row level security;

revoke all on public.arbor_investigation_evidence from public,anon,authenticated;
revoke all on public.arbor_investigation_claims from public,anon,authenticated;
revoke all on public.arbor_investigation_claim_evidence from public,anon,authenticated;
revoke all on public.arbor_investigation_contradiction_events from public,anon,authenticated;
revoke all on public.arbor_investigation_falsification_attempts from public,anon,authenticated;

grant select on public.arbor_investigation_evidence to authenticated;
grant select on public.arbor_investigation_claims to authenticated;
grant select on public.arbor_investigation_claim_evidence to authenticated;
grant select on public.arbor_investigation_contradiction_events to authenticated;
grant select on public.arbor_investigation_falsification_attempts to authenticated;

grant select,insert on public.arbor_investigation_evidence to service_role;
grant select,insert on public.arbor_investigation_claims to service_role;
grant select,insert on public.arbor_investigation_claim_evidence to service_role;
grant select,insert on public.arbor_investigation_contradiction_events to service_role;
grant select,insert on public.arbor_investigation_falsification_attempts to service_role;

drop policy if exists arbor_investigation_evidence_owner_read
  on public.arbor_investigation_evidence;
drop policy if exists arbor_investigation_claims_owner_read
  on public.arbor_investigation_claims;
drop policy if exists arbor_investigation_claim_evidence_owner_read
  on public.arbor_investigation_claim_evidence;
drop policy if exists arbor_investigation_contradiction_owner_read
  on public.arbor_investigation_contradiction_events;
drop policy if exists arbor_investigation_falsification_owner_read
  on public.arbor_investigation_falsification_attempts;

create policy arbor_investigation_evidence_owner_read
  on public.arbor_investigation_evidence
  for select to authenticated using (user_id=(select auth.uid()));
create policy arbor_investigation_claims_owner_read
  on public.arbor_investigation_claims
  for select to authenticated using (user_id=(select auth.uid()));
create policy arbor_investigation_claim_evidence_owner_read
  on public.arbor_investigation_claim_evidence
  for select to authenticated using (user_id=(select auth.uid()));
create policy arbor_investigation_contradiction_owner_read
  on public.arbor_investigation_contradiction_events
  for select to authenticated using (user_id=(select auth.uid()));
create policy arbor_investigation_falsification_owner_read
  on public.arbor_investigation_falsification_attempts
  for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.arbor_load_investigation_finding_context(
  p_claim_id uuid,p_user_id uuid,p_project_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_claim public.arbor_investigation_claims%rowtype;
        v_support jsonb;
        v_counter text[];
        v_contradictions text[];
        v_falsification jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'investigation_integrity_service_role_required';
  end if;

  select * into v_claim
  from public.arbor_investigation_claims
  where id=p_claim_id and user_id=p_user_id and project_id=p_project_id;

  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id::text,
    'evidenceClass',e.evidence_class,
    'sourceRef',e.source_ref,
    'lineageKey',e.lineage_key,
    'content',e.content,
    'contentSha256',e.content_sha256,
    'supports',to_jsonb(e.supports),
    'underlyingSourceRef',e.underlying_source_ref
  ) order by e.created_at,e.id),'[]'::jsonb)
  into v_support
  from public.arbor_investigation_claim_evidence ce
  join public.arbor_investigation_evidence e
    on e.id=ce.evidence_id and e.user_id=ce.user_id and e.project_id=ce.project_id
  where ce.claim_id=p_claim_id and ce.user_id=p_user_id
    and ce.project_id=p_project_id and ce.role='support';

  select coalesce(array_agg(e.id::text order by e.created_at,e.id),'{}'::text[])
  into v_counter
  from public.arbor_investigation_claim_evidence ce
  join public.arbor_investigation_evidence e
    on e.id=ce.evidence_id and e.user_id=ce.user_id and e.project_id=ce.project_id
  where ce.claim_id=p_claim_id and ce.user_id=p_user_id
    and ce.project_id=p_project_id and ce.role='counter';

  with latest as (
    select distinct on (contradiction_key)
      contradiction_key,state,created_at,id
    from public.arbor_investigation_contradiction_events
    where claim_id=p_claim_id and user_id=p_user_id and project_id=p_project_id
    order by contradiction_key,created_at desc,id desc
  )
  select coalesce(array_agg(contradiction_key order by contradiction_key),'{}'::text[])
  into v_contradictions
  from latest where state='open';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id::text,
    'hypothesis',hypothesis,
    'result',result,
    'evidenceRefs',to_jsonb(evidence_refs)
  ) order by created_at,id),'[]'::jsonb)
  into v_falsification
  from public.arbor_investigation_falsification_attempts
  where claim_id=p_claim_id and user_id=p_user_id and project_id=p_project_id;

  return jsonb_build_object(
    'claimId',v_claim.id::text,
    'claimText',v_claim.claim_text,
    'assertionKind',v_claim.assertion_kind,
    'support',v_support,
    'counterEvidenceRefs',to_jsonb(v_counter),
    'unresolvedContradictionIds',to_jsonb(v_contradictions),
    'falsificationAttempts',v_falsification,
    'negativeEvidence',
      case when v_claim.negative_evidence_state is null then null
      else jsonb_build_object(
        'state',v_claim.negative_evidence_state,
        'scope',v_claim.negative_evidence_scope,
        'proofRef',v_claim.negative_evidence_proof_ref
      ) end
  );
end $$;

revoke all on function public.arbor_reject_investigation_mutation()
  from public,anon,authenticated;
revoke all on function public.arbor_load_investigation_finding_context
  (uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.arbor_load_investigation_finding_context
  (uuid,uuid,uuid) to service_role;
