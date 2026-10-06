-- PROPOSAL ONLY. Apply after reviewed research session + v6 integration schemas.
-- No execution flag, CHECK constraint or scheduler is changed here.
-- Explicit unit identity prevents a retried HTTP intent claiming different work.
create or replace function public.arbor_claim_document_hop_unit(
  p_session_id uuid,p_user_id uuid,p_project_id uuid,p_worker_id text,p_unit_id uuid,
  p_lease_seconds integer default 240
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_session public.arbor_research_sessions%rowtype;
        v_unit public.arbor_research_units%rowtype;
        v_now timestamptz;
begin
  if p_unit_id is null or p_worker_id is null or length(btrim(p_worker_id)) = 0 or
     p_lease_seconds not between 30 and 300 then
    raise exception 'invalid_research_lease';
  end if;
  select * into v_session from public.arbor_research_sessions
    where id=p_session_id and user_id=p_user_id and project_id=p_project_id
    for update;
  if not found then return null; end if;
  -- Activation is checked inside the same transaction as the claim.
  -- Current v6 schema forbids execution_enabled=true; this function cannot open it.
  perform 1 from public.arbor_research_integration_state
    where owner_id=p_user_id and project_id=p_project_id
      and execution_enabled=true and scheduler_enabled=false
      and real_source_ingestion_enabled=false and publication_enabled=false
    for share;
  if not found then return null; end if;
  -- Re-read time AFTER the session row lock, not before waiting on it.
  v_now := clock_timestamp();
  if v_session.status in ('cancelled','completed','timebox_ended','paused','blocked') then
    return null;
  end if;
  if v_session.cancellation_requested then
    update public.arbor_research_sessions set status='cancelled',
      status_reason='cancelled_by_owner',updated_at=v_now where id=p_session_id;
    return null;
  end if;
  -- A scheduled session cannot execute before its configured start time.
  if v_now < v_session.started_at then return null; end if;
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
  -- Completion must be independently verified; an empty objective queue is
  -- idle, never permission to claim unrelated leftover work.
  if v_session.unresolved_required_work = 0 then return null; end if;
  -- No two active reservations in one session: caps are checked atomically.
  if exists(select 1 from public.arbor_research_units
      where session_id=p_session_id and status='leased'
        and lease_expires_at>v_now) then return null; end if;
  select * into v_unit from public.arbor_research_units
    where session_id=p_session_id and user_id=p_user_id and project_id=p_project_id
      and id=p_unit_id and kind='document_pattern_hop_search'
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
        -- Never issue a lease that outlives the authorized research window.
        lease_expires_at=least(
          v_now+make_interval(secs=>p_lease_seconds),v_session.deadline_at
        ),
        updated_at=v_now
    where id=v_unit.id returning * into v_unit;
  update public.arbor_research_sessions
    set status='running',updated_at=v_now where id=p_session_id;
  return jsonb_build_object('unitId',v_unit.id,'leaseToken',v_unit.lease_token,
    'idempotencyKey',v_unit.unit_key,'kind',v_unit.kind,'payload',v_unit.payload,
    'maxCostReservationCents',v_unit.max_cost_reservation_cents);
end $$;

revoke all on function public.arbor_claim_document_hop_unit(uuid,uuid,uuid,text,uuid,integer)
  from public,anon,authenticated;
grant execute on function public.arbor_claim_document_hop_unit(uuid,uuid,uuid,text,uuid,integer)
  to service_role;
