-- ARK explicit STOP and bounded blocked-objective resume controls.
-- Source-only migration. Applying this migration remains a protected/live action.
--
-- STOP semantics:
-- - completed objectives are immutable;
-- - repeated cancellation is idempotent;
-- - cancelling clears active task leases so stale workers cannot checkpoint,
--   complete, block, or fail work after cancellation;
-- - already-completed tasks remain completed;
-- - no cancellation attempts to undo an external side effect that may already
--   have occurred before the durable STOP boundary.
--
-- Resume semantics:
-- - only a genuinely blocked objective with at least one blocked task may be
--   resumed;
-- - failed/cancelled/completed objectives are never resurrected;
-- - completed tasks are never replayed;
-- - ambiguous/non-retryable failed work is not silently converted to queued.

create or replace function public.ark_cancel_objective(
  p_objective_id uuid,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_objective public.ark_objectives;
  v_cancelled_tasks integer := 0;
begin
  select * into v_objective
  from public.ark_objectives
  where id = p_objective_id
  for update;

  if v_objective.id is null then
    raise exception 'ark_objective_not_found' using errcode = 'P0002';
  end if;

  if v_objective.status = 'completed' then
    raise exception 'ark_completed_objective_cannot_cancel' using errcode = '40001';
  end if;

  if v_objective.status = 'cancelled' then
    return to_jsonb(v_objective);
  end if;

  update public.ark_tasks
  set status = 'cancelled',
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      heartbeat_at = null,
      version = version + 1,
      updated_at = p_now
  where objective_id = p_objective_id
    and status not in ('completed', 'cancelled');

  get diagnostics v_cancelled_tasks = row_count;

  update public.ark_objectives
  set status = 'cancelled',
      blocker = jsonb_build_object(
        'kind', 'cancelled',
        'message', 'ARK objective cancelled at an explicit STOP boundary'
      ),
      version = version + 1,
      updated_at = p_now
  where id = p_objective_id
  returning * into v_objective;

  insert into public.ark_events (objective_id, event_type, payload)
  values (
    p_objective_id,
    'objective_cancelled',
    jsonb_build_object('cancelledTasks', v_cancelled_tasks)
  );

  return to_jsonb(v_objective);
end;
$$;

create or replace function public.ark_resume_blocked_objective(
  p_objective_id uuid,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_objective public.ark_objectives;
  v_resumed_tasks integer := 0;
begin
  select * into v_objective
  from public.ark_objectives
  where id = p_objective_id
  for update;

  if v_objective.id is null then
    raise exception 'ark_objective_not_found' using errcode = 'P0002';
  end if;

  if v_objective.status <> 'blocked' then
    raise exception 'ark_objective_not_blocked' using errcode = '40001';
  end if;

  if not exists (
    select 1 from public.ark_tasks
    where objective_id = p_objective_id and status = 'blocked'
  ) then
    raise exception 'ark_resume_requires_blocked_task' using errcode = '40001';
  end if;

  update public.ark_tasks
  set status = 'queued',
      result = null,
      available_at = p_now,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      heartbeat_at = null,
      version = version + 1,
      updated_at = p_now
  where objective_id = p_objective_id
    and status = 'blocked';

  get diagnostics v_resumed_tasks = row_count;

  update public.ark_objectives
  set status = 'queued',
      blocker = null,
      version = version + 1,
      updated_at = p_now
  where id = p_objective_id
  returning * into v_objective;

  insert into public.ark_events (objective_id, event_type, payload)
  values (
    p_objective_id,
    'objective_resumed',
    jsonb_build_object('resumedTasks', v_resumed_tasks)
  );

  return to_jsonb(v_objective);
end;
$$;

revoke all on function public.ark_cancel_objective(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.ark_resume_blocked_objective(uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.ark_cancel_objective(uuid, timestamptz)
  to service_role;
grant execute on function public.ark_resume_blocked_objective(uuid, timestamptz)
  to service_role;
