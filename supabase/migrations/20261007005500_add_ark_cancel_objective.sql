-- Source-only durable STOP primitive for ARK objectives.
-- This migration is not applied by the continuity lane. Callers must perform
-- owner/project authorization before using a service-role client.

create or replace function public.ark_cancel_objective(
  p_objective_id uuid,
  p_user_id uuid,
  p_project_id uuid,
  p_reason text,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_objective public.ark_objectives;
begin
  if length(btrim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception 'ark_cancel_reason_required' using errcode = '22023';
  end if;

  select * into v_objective
  from public.ark_objectives
  where id = p_objective_id
    and user_id = p_user_id
    and project_id = p_project_id
  for update;

  if v_objective.id is null then
    raise exception 'ark_objective_not_found' using errcode = '42501';
  end if;

  if v_objective.status = 'completed' then
    raise exception 'ark_completed_objective_cannot_be_cancelled' using errcode = '55000';
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
    and user_id = p_user_id
    and project_id = p_project_id
    and status not in ('completed', 'cancelled');

  update public.ark_objectives
  set status = 'cancelled',
      blocker = jsonb_build_object('kind', 'stopped', 'message', left(btrim(p_reason), 1000)),
      version = version + 1,
      updated_at = p_now
  where id = p_objective_id
    and user_id = p_user_id
    and project_id = p_project_id
  returning * into v_objective;

  insert into public.ark_events (objective_id, event_type, payload)
  values (
    p_objective_id,
    'objective_cancelled',
    jsonb_build_object('reason', left(btrim(p_reason), 1000))
  );

  return to_jsonb(v_objective);
end;
$$;

revoke all on function public.ark_cancel_objective(uuid, uuid, uuid, text, timestamptz) from public;
revoke all on function public.ark_cancel_objective(uuid, uuid, uuid, text, timestamptz) from anon;
revoke all on function public.ark_cancel_objective(uuid, uuid, uuid, text, timestamptz) from authenticated;
grant execute on function public.ark_cancel_objective(uuid, uuid, uuid, text, timestamptz) to service_role;
