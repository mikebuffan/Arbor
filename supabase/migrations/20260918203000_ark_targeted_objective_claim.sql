-- Add targeted ARK claims so an interactive bridge can execute one durable
-- objective without consuming unrelated queued work.

drop function if exists public.ark_claim_next_task(text, integer, timestamptz, uuid[]);

create or replace function public.ark_claim_next_task(
  p_worker_id text,
  p_lease_ms integer,
  p_now timestamptz,
  p_excluded_objective_ids uuid[] default '{}'::uuid[],
  p_only_objective_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_task public.ark_tasks;
  v_objective public.ark_objectives;
begin
  if p_lease_ms < 1000 or p_lease_ms > 3600000 then
    raise exception 'ark_invalid_lease_duration' using errcode = '22023';
  end if;

  update public.ark_tasks
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      last_error = case when attempt_count >= max_attempts then 'ark_lease_expired_attempts_exhausted' else last_error end,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      heartbeat_at = null,
      version = version + 1,
      updated_at = p_now
  where status = 'running' and lease_expires_at <= p_now;

  update public.ark_objectives o
  set status = 'failed',
      blocker = jsonb_build_object('kind', 'task_failed', 'message', 'An ARK task exhausted its lease retries'),
      version = version + 1,
      updated_at = p_now
  where o.status not in ('completed', 'failed', 'cancelled')
    and exists (
      select 1 from public.ark_tasks t
      where t.objective_id = o.id and t.status = 'failed'
    );

  select t.* into v_task
  from public.ark_tasks t
  join public.ark_objectives o on o.id = t.objective_id
  where t.status in ('queued', 'checkpointed')
    and t.available_at <= p_now
    and t.attempt_count < t.max_attempts
    and o.status in ('queued', 'running', 'checkpointed')
    and not (t.objective_id = any(coalesce(p_excluded_objective_ids, '{}'::uuid[])))
    and (p_only_objective_id is null or t.objective_id = p_only_objective_id)
    and not exists (
      select 1
      from unnest(t.dependencies) dependency(task_key)
      left join public.ark_tasks prerequisite
        on prerequisite.objective_id = t.objective_id
       and prerequisite.task_key = dependency.task_key
      where prerequisite.id is null or prerequisite.status <> 'completed'
    )
  order by o.priority desc, t.available_at, t.created_at, t.id
  for update of t skip locked
  limit 1;

  if v_task.id is null then return null; end if;

  update public.ark_tasks
  set status = 'running',
      attempt_count = attempt_count + 1,
      lease_owner = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_expires_at = p_now + make_interval(secs => p_lease_ms::double precision / 1000),
      heartbeat_at = p_now,
      version = version + 1,
      updated_at = p_now
  where id = v_task.id
  returning * into v_task;

  update public.ark_objectives
  set status = 'running', blocker = null, version = version + 1, updated_at = p_now
  where id = v_task.objective_id
  returning * into v_objective;

  insert into public.ark_events (objective_id, task_id, event_type, payload)
  values (v_task.objective_id, v_task.id, 'task_claimed', jsonb_build_object('workerId', p_worker_id, 'attempt', v_task.attempt_count));

  return jsonb_build_object('objective', to_jsonb(v_objective), 'task', to_jsonb(v_task));
end;
$$;

revoke all on function public.ark_claim_next_task(text, integer, timestamptz, uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.ark_claim_next_task(text, integer, timestamptz, uuid[], uuid)
  to service_role;
