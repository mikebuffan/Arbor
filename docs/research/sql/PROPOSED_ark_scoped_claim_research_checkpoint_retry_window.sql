-- PROPOSED ONLY: source-review fixture, NOT an applied migration.
-- Actual ARK Preview pg_get_functiondef on 2026-09-23 differs from the already
-- version-controlled targeted-claim migration: Preview has a global sweep.
-- Do not apply until shared ARK owner reviews and disposable PG tests pass.
-- Claim function below is the existing checked-in targeted implementation.
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
  where status = 'running' and lease_expires_at <= p_now
    and (p_only_objective_id is null or objective_id = p_only_objective_id);

  update public.ark_objectives o
  set status = 'failed',
      blocker = jsonb_build_object('kind', 'task_failed', 'message', 'An ARK task exhausted its lease retries'),
      version = version + 1,
      updated_at = p_now
  where o.status not in ('completed', 'failed', 'cancelled')
    and (p_only_objective_id is null or o.id = p_only_objective_id)
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


-- Proposed narrowly scoped research checkpoint retry-window reset.
-- A successful research tick MUST have its evidence receipt persisted by the
-- trusted research store BEFORE calling this ARK checkpoint RPC.
-- Checkpoint sequence and append-only events remain monotonic.
create or replace function public.ark_checkpoint_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_sequence integer,
  p_state jsonb,
  p_next_action text,
  p_reason text,
  p_resume_after timestamptz,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_task public.ark_tasks;
begin
  select * into v_task from public.ark_tasks
  where id = p_task_id and status = 'running'
    and lease_owner = p_worker_id and lease_token = p_lease_token
    and lease_expires_at > p_now
  for update;
  if v_task.id is null then raise exception 'ark_lease_lost' using errcode = '40001'; end if;
  if p_sequence <> v_task.checkpoint_sequence + 1 then
    raise exception 'ark_checkpoint_sequence_conflict' using errcode = '40001';
  end if;

  insert into public.ark_checkpoints (objective_id, task_id, sequence, state, next_action, reason, created_at)
  values (v_task.objective_id, v_task.id, p_sequence, coalesce(p_state, '{}'::jsonb), p_next_action, p_reason, p_now);

  update public.ark_tasks
  set status = 'checkpointed', checkpoint_sequence = p_sequence,
      -- Only a persisted, successful research receipt opens a fresh retry window.
      -- Other ARK kinds retain their original cumulative attempt behavior.
      attempt_count = case
        when kind = 'research.session.tick'
          and p_reason = 'executor'
          and p_state->>'kind' = 'research_session_reference'
          and coalesce(p_state->>'authorizationVersion', '') <> ''
          and jsonb_typeof(p_state->'latestEvidenceRefs') = 'array'
        then 0 else attempt_count end,
      available_at = greatest(p_resume_after, p_now),
      lease_owner = null, lease_token = null, lease_expires_at = null, heartbeat_at = null,
      version = version + 1, updated_at = p_now
  where id = p_task_id returning * into v_task;

  update public.ark_objectives
  set status = 'checkpointed', version = version + 1, updated_at = p_now
  where id = v_task.objective_id and status not in ('completed', 'failed', 'cancelled');

  insert into public.ark_events (objective_id, task_id, event_type, payload)
  values (v_task.objective_id, v_task.id, 'task_checkpointed', jsonb_build_object('sequence', p_sequence, 'nextAction', p_next_action, 'reason', p_reason));
  return to_jsonb(v_task);
end;
$$;

