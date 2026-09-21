-- PROPOSAL ONLY. Not in migrations directory; no automatic production application.
-- Sandbox DB review/test required. Do not run against original Firefly.
-- Owner-scoped durable 60-minute research sessions. Existing ARK/investigation tables
-- remain unchanged. No worker, cron, or production flag is enabled here.
create table if not exists public.arbor_research_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  objective text not null check (length(btrim(objective)) between 1 and 4000),
  status text not null default 'queued' check
    (status in ('queued','running','paused','blocked','timebox_ended','completed','cancelled')),
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  max_work_units integer not null check (max_work_units between 1 and 10000),
  consumed_work_units integer not null default 0 check
    (consumed_work_units >= 0 and consumed_work_units <= max_work_units),
  max_cost_cents integer not null check (max_cost_cents between 0 and 1000000),
  committed_cost_cents integer not null default 0 check
    (committed_cost_cents >= 0 and committed_cost_cents <= max_cost_cents),
  authorized boolean not null default false,
  cancellation_requested boolean not null default false,
  unresolved_required_work integer not null default 0 check
    (unresolved_required_work between 0 and 1000000),
  completed_evidence_refs text[] not null default '{}',
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arbor_research_session_duration_check
    check (deadline_at > started_at and deadline_at <= started_at + interval '1 hour'),
  constraint arbor_research_session_project_owner_fk
    foreign key (project_id,user_id) references public.projects(id,user_id) on delete cascade,
  constraint arbor_research_session_identity_uniq unique (id,user_id,project_id)
);

create table if not exists public.arbor_research_units (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  unit_key text not null check (length(btrim(unit_key)) between 1 and 200),
  kind text not null check (length(btrim(kind)) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check
    (status in ('queued','leased','completed','blocked','failed','cancelled')),
  max_cost_reservation_cents integer not null default 1 check
    (max_cost_reservation_cents between 0 and 1000000),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arbor_research_units_owner_fk foreign key (session_id,user_id,project_id)
    references public.arbor_research_sessions(id,user_id,project_id) on delete cascade,
  constraint arbor_research_units_session_key unique (session_id,unit_key),
  constraint arbor_research_units_identity_uniq unique (id,session_id,user_id,project_id)
);
create index if not exists arbor_research_units_claim_idx
  on public.arbor_research_units(session_id,status,available_at,lease_expires_at);

create table if not exists public.arbor_research_receipts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  unit_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  lease_token uuid not null,
  idempotency_key text not null,
  status text not null check (status in ('completed','checkpointed','blocked','failed')),
  cost_cents integer not null check (cost_cents between 0 and 1000000),
  evidence_refs text[] not null default '{}',
  unresolved_required_work integer not null check (unresolved_required_work between 0 and 1000000),
  result jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  constraint arbor_research_receipts_owner_fk foreign key
    (unit_id,session_id,user_id,project_id)
    references public.arbor_research_units(id,session_id,user_id,project_id) on delete cascade,
  constraint arbor_research_receipts_one_per_lease unique (unit_id,lease_token)
);
create index if not exists arbor_research_receipts_session_idx
  on public.arbor_research_receipts(session_id,recorded_at);

alter table public.arbor_research_sessions enable row level security;
alter table public.arbor_research_units enable row level security;
alter table public.arbor_research_receipts enable row level security;
revoke all on public.arbor_research_sessions from public,anon,authenticated;
revoke all on public.arbor_research_units from public,anon,authenticated;
revoke all on public.arbor_research_receipts from public,anon,authenticated;
grant select on public.arbor_research_sessions to authenticated;
grant select on public.arbor_research_units to authenticated;
grant select on public.arbor_research_receipts to authenticated;
grant all on public.arbor_research_sessions to service_role;
grant all on public.arbor_research_units to service_role;
grant all on public.arbor_research_receipts to service_role;
create policy arbor_research_sessions_owner_read on public.arbor_research_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy arbor_research_units_owner_read on public.arbor_research_units
  for select to authenticated using (user_id = (select auth.uid()));
create policy arbor_research_receipts_owner_read on public.arbor_research_receipts
  for select to authenticated using (user_id = (select auth.uid()));

-- Service-role-only RPC. Store/route must bind the authenticated owner/project;
-- never let a client select an arbitrary owner for a service-role call.
create or replace function public.arbor_claim_research_unit(
  p_session_id uuid,p_user_id uuid,p_project_id uuid,p_worker_id text,
  p_lease_seconds integer default 240
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_session public.arbor_research_sessions%rowtype;
        v_unit public.arbor_research_units%rowtype;
        v_now timestamptz := clock_timestamp();
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'research_worker_service_role_required';
  end if;
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or
     p_lease_seconds not between 30 and 300 then
    raise exception 'invalid_research_lease';
  end if;
  select * into v_session from public.arbor_research_sessions
    where id=p_session_id and user_id=p_user_id and project_id=p_project_id
    for update;
  if not found then return null; end if;
  if v_session.status in ('cancelled','completed','timebox_ended','paused','blocked') then
    return null;
  end if;
  if v_session.cancellation_requested then
    update public.arbor_research_sessions set status='cancelled',
      status_reason='cancelled_by_owner',updated_at=v_now where id=p_session_id;
    return null;
  end if;
  if v_now >= v_session.deadline_at or
     v_session.consumed_work_units >= v_session.max_work_units or
     v_session.committed_cost_cents >= v_session.max_cost_cents then
    update public.arbor_research_sessions set status='timebox_ended',
      status_reason='time_or_budget_exhausted',updated_at=v_now where id=p_session_id;
    return null;
  end if;
  if not v_session.authorized then
    update public.arbor_research_sessions set status='blocked',
      status_reason='authorization_required',updated_at=v_now where id=p_session_id;
    return null;
  end if;
  -- No two active reservations in one session: caps are checked atomically.
  if exists(select 1 from public.arbor_research_units
      where session_id=p_session_id and status='leased'
        and lease_expires_at>v_now) then return null; end if;
  select * into v_unit from public.arbor_research_units
    where session_id=p_session_id
      and ((status='queued' and available_at<=v_now) or
           (status='leased' and lease_expires_at<=v_now))
      and attempt_count<max_attempts
      and max_cost_reservation_cents <=
        v_session.max_cost_cents-v_session.committed_cost_cents
    order by available_at,id limit 1 for update skip locked;
  if not found then return null; end if;
  update public.arbor_research_units
    set status='leased',attempt_count=attempt_count+1,lease_owner=p_worker_id,
        lease_token=gen_random_uuid(),
        lease_expires_at=v_now+make_interval(secs=>p_lease_seconds),
        updated_at=v_now
    where id=v_unit.id returning * into v_unit;
  update public.arbor_research_sessions
    set status='running',updated_at=v_now where id=p_session_id;
  return jsonb_build_object('unitId',v_unit.id,'leaseToken',v_unit.lease_token,
    'idempotencyKey',v_unit.unit_key,'kind',v_unit.kind,'payload',v_unit.payload,
    'maxCostReservationCents',v_unit.max_cost_reservation_cents);
end $$;

create or replace function public.arbor_settle_research_unit(
  p_session_id uuid,p_user_id uuid,p_project_id uuid,p_unit_id uuid,
  p_lease_token uuid,p_idempotency_key text,p_status text,
  p_cost_cents integer,p_evidence_refs text[],p_unresolved_required_work integer,
  p_result jsonb default '{}'::jsonb
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_session public.arbor_research_sessions%rowtype;
        v_unit public.arbor_research_units%rowtype;
        v_now timestamptz := clock_timestamp();
        v_status text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'research_worker_service_role_required';
  end if;
  select * into v_session from public.arbor_research_sessions
    where id=p_session_id and user_id=p_user_id and project_id=p_project_id
    for update;
  if not found then return 'lease_lost'; end if;
  select * into v_unit from public.arbor_research_units
    where id=p_unit_id and session_id=p_session_id
      and user_id=p_user_id and project_id=p_project_id for update;
  if not found then return 'lease_lost'; end if;
  if exists(select 1 from public.arbor_research_receipts
      where unit_id=p_unit_id and lease_token=p_lease_token) then
    return 'duplicate';
  end if;
  if v_unit.status<>'leased' or v_unit.lease_token is distinct from p_lease_token
     or v_unit.lease_expires_at<=v_now
     or p_idempotency_key is distinct from v_unit.unit_key
     or v_session.status='cancelled' or v_session.cancellation_requested then
    return 'lease_lost';
  end if;
  if p_status not in ('completed','checkpointed','blocked','failed')
     or p_cost_cents is null or p_cost_cents<0
     or p_cost_cents>v_unit.max_cost_reservation_cents
     or v_session.committed_cost_cents+p_cost_cents>v_session.max_cost_cents
     or p_unresolved_required_work is null
     or p_unresolved_required_work not between 0 and 1000000
     or p_evidence_refs is null or array_position(p_evidence_refs,null) is not null
     or (p_unresolved_required_work<v_session.unresolved_required_work
          and cardinality(p_evidence_refs)=0) then
    raise exception 'invalid_research_receipt';
  end if;
  insert into public.arbor_research_receipts
      (session_id,unit_id,user_id,project_id,lease_token,idempotency_key,
       status,cost_cents,evidence_refs,unresolved_required_work,result,recorded_at)
    values (p_session_id,p_unit_id,p_user_id,p_project_id,p_lease_token,
       p_idempotency_key,p_status,p_cost_cents,p_evidence_refs,
       p_unresolved_required_work,coalesce(p_result,'{}'::jsonb),v_now);
  v_status := case when p_status='completed' then 'completed'
    when p_status='blocked' then 'blocked'
    when p_status='failed' and v_unit.attempt_count>=v_unit.max_attempts then 'failed'
    else 'queued' end;
  update public.arbor_research_units
    set status=v_status,lease_owner=null,lease_token=null,lease_expires_at=null,
        available_at=v_now+case when v_status='queued' then interval '30 seconds'
          else interval '0 seconds' end,
        last_result=coalesce(p_result,'{}'::jsonb),updated_at=v_now where id=p_unit_id;
  update public.arbor_research_sessions
    set consumed_work_units=consumed_work_units+
          case when p_status='completed' then 1 else 0 end,
        committed_cost_cents=committed_cost_cents+p_cost_cents,
        unresolved_required_work=p_unresolved_required_work,
        completed_evidence_refs=(select coalesce(array_agg(distinct ref order by ref),'{}'::text[])
          from unnest(v_session.completed_evidence_refs||p_evidence_refs) as refs(ref)
          where ref<>''),updated_at=v_now
    where id=p_session_id;
  return 'committed';
end $$;

create or replace function public.arbor_stop_research_session(
  p_session_id uuid,p_user_id uuid,p_project_id uuid,p_status text,p_reason text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'research_worker_service_role_required';
  end if;
  if p_status not in ('blocked','timebox_ended','cancelled') then
    raise exception 'invalid_research_stop_status';
  end if;
  update public.arbor_research_sessions
    set status=p_status,status_reason=left(coalesce(p_reason,''),500),
      cancellation_requested=cancellation_requested or p_status='cancelled',
      updated_at=clock_timestamp()
    where id=p_session_id and user_id=p_user_id and project_id=p_project_id
      and status not in ('completed','cancelled','timebox_ended');
  return found;
end $$;
revoke all on function public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)
  from public,anon,authenticated;
revoke all on function public.arbor_settle_research_unit
  (uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)
  from public,anon,authenticated;
revoke all on function public.arbor_stop_research_session
  (uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)
  to service_role;
grant execute on function public.arbor_settle_research_unit
  (uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)
  to service_role;
grant execute on function public.arbor_stop_research_session
  (uuid,uuid,uuid,text,text) to service_role;
