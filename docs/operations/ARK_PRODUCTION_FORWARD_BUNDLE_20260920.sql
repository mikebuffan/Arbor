-- ARK PRODUCTION FORWARD BUNDLE — 2026-09-20
-- GENERATED FROM TESTED RELEASE CANDIDATE e7b86044de5bf90f389df14a2d404aad18c38be5.
-- DO NOT AUTO-RUN. This file lives under docs/operations (not supabase/migrations) intentionally.
-- Purpose: provide one reviewed forward-only SQL bundle for production after a verified restorable backup.
-- Production inspection on 2026-09-20 confirmed the first-claim function, idempotency UPDATE policy,
-- autonomous work-job table/function, and all ARK tables are absent; existing agency state columns and
-- arbor_agency_idempotency table are present. This avoids replaying conflicting historical preview migrations.
-- Apply only to original Firefly after restore verification, then re-run the documented read-only checks.

-- BEGIN supabase/migrations/20260918023000_arbor_agency_first_claim.sql
-- Atomically claim the first durable agency objective for a project.
-- Prevents two simultaneous first turns from both upserting and silently
-- replacing one another before a revision exists.

create or replace function public.arbor_claim_agency_state(
  p_user_id uuid,
  p_project_id uuid,
  p_goal text,
  p_status text,
  p_current_step integer,
  p_unresolved_work jsonb,
  p_recurring_weaknesses jsonb,
  p_strategy_notes jsonb,
  p_blocker text,
  p_objective jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $func$
declare
  affected integer;
begin
  insert into public.arbor_runtime_state (
    user_id,
    project_id,
    agency_goal,
    agency_status,
    agency_current_step,
    agency_unresolved_work,
    agency_recurring_weaknesses,
    agency_strategy_notes,
    agency_blocker,
    agency_objective,
    updated_at
  )
  values (
    p_user_id,
    p_project_id,
    p_goal,
    p_status,
    p_current_step,
    coalesce(p_unresolved_work, '[]'::jsonb),
    coalesce(p_recurring_weaknesses, '[]'::jsonb),
    coalesce(p_strategy_notes, '[]'::jsonb),
    p_blocker,
    p_objective,
    now()
  )
  on conflict (user_id, project_id) do nothing;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$func$;

revoke all on function public.arbor_claim_agency_state(
  uuid, uuid, text, text, integer, jsonb, jsonb, jsonb, text, jsonb
) from public;

grant execute on function public.arbor_claim_agency_state(
  uuid, uuid, text, text, integer, jsonb, jsonb, jsonb, text, jsonb
) to authenticated;

-- END supabase/migrations/20260918023000_arbor_agency_first_claim.sql

-- BEGIN supabase/migrations/20260918024500_arbor_agency_idempotency_update_policy.sql
-- Completing an idempotent operation updates only its stored result.
-- Without an UPDATE policy, authenticated runtime clients can claim a key
-- but cannot persist the completed result under RLS.

drop policy if exists arbor_agency_idempotency_owner_update
  on public.arbor_agency_idempotency;

create policy arbor_agency_idempotency_owner_update
  on public.arbor_agency_idempotency for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- END supabase/migrations/20260918024500_arbor_agency_idempotency_update_policy.sql

-- BEGIN supabase/migrations/20260918030000_arbor_autonomous_work_runner.sql
-- Durable ARK autonomous work runner.
-- Jobs survive request boundaries; leases prevent concurrent workers from
-- owning the same job; exact next action/checkpoint make continuation explicit.

create table if not exists public.arbor_work_jobs (
  job_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_goal text not null,
  status text not null default 'queued'
    check (status in ('queued','running','checkpointed','blocked','complete','failed')),
  next_action text null,
  unresolved_work jsonb not null default '[]'::jsonb,
  completion_criteria jsonb not null default '[]'::jsonb,
  checkpoint jsonb null,
  revision integer not null default 1,
  lease_owner text null,
  lease_expires_at timestamptz null,
  last_heartbeat_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arbor_work_jobs_claim_idx
  on public.arbor_work_jobs(status, lease_expires_at, updated_at);
create index if not exists arbor_work_jobs_owner_idx
  on public.arbor_work_jobs(user_id, project_id, updated_at desc);

-- Protect work jobs independently of the later ARK-only migrations.
-- A service-role client bypasses RLS, so require real project ownership here.
create unique index if not exists projects_id_user_id_ark_owner_idx
  on public.projects (id, user_id);

alter table public.arbor_work_jobs
  add constraint arbor_work_jobs_project_owner_fk
  foreign key (project_id, user_id)
  references public.projects (id, user_id)
  on delete cascade;

alter table public.arbor_work_jobs enable row level security;
drop policy if exists arbor_work_jobs_owner_select on public.arbor_work_jobs;
create policy arbor_work_jobs_owner_select on public.arbor_work_jobs for select
  using (user_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
drop policy if exists arbor_work_jobs_owner_insert on public.arbor_work_jobs;
create policy arbor_work_jobs_owner_insert on public.arbor_work_jobs for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));
drop policy if exists arbor_work_jobs_owner_update on public.arbor_work_jobs;
create policy arbor_work_jobs_owner_update on public.arbor_work_jobs for update
  using (user_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ));

create or replace function public.arbor_claim_work_job(
  p_user_id uuid, p_project_id uuid, p_worker_id text, p_lease_seconds integer default 90
) returns public.arbor_work_jobs
language plpgsql security invoker set search_path = public
as $func$
declare claimed public.arbor_work_jobs;
begin
  select * into claimed from public.arbor_work_jobs
  where user_id=p_user_id and project_id=p_project_id
    and status in ('queued','checkpointed','running')
    and (lease_expires_at is null or lease_expires_at < now())
  order by updated_at asc
  for update skip locked limit 1;
  if claimed.job_id is null then return null; end if;
  update public.arbor_work_jobs set
    status='running', lease_owner=p_worker_id,
    lease_expires_at=now()+make_interval(secs => greatest(10,p_lease_seconds)),
    last_heartbeat_at=now(), updated_at=now(), revision=revision+1
  where job_id=claimed.job_id returning * into claimed;
  return claimed;
end;$func$;

revoke all on function public.arbor_claim_work_job(uuid,uuid,text,integer) from public;
grant execute on function public.arbor_claim_work_job(uuid,uuid,text,integer) to authenticated;

-- END supabase/migrations/20260918030000_arbor_autonomous_work_runner.sql

-- BEGIN supabase/migrations/20260918143000_create_ark_autonomous_work_runner.sql
-- ARK is Arbor's durable execution carrier. Arbor remains the canonical
-- controller; these tables preserve objectives, dependency tasks, leases,
-- checkpoints, retries, and verification evidence across bounded executions.

create table if not exists public.ark_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  goal text not null check (length(btrim(goal)) between 1 and 4000),
  status text not null default 'queued'
    check (status in (
      'queued', 'running', 'checkpointed', 'blocked',
      'awaiting_verification', 'completed', 'failed', 'cancelled'
    )),
  priority integer not null default 0 check (priority between -100 and 100),
  budget jsonb not null default '{"maxTasksPerCycle":8,"maxRuntimeMs":25000,"maxAttemptsPerTask":3}'::jsonb,
  blocker jsonb null,
  completion_evidence jsonb null,
  idempotency_key text not null check (length(btrim(idempotency_key)) between 1 and 200),
  request_hash text not null check (length(request_hash) = 32),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, idempotency_key)
);

create table if not exists public.ark_tasks (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.ark_objectives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_key text not null check (length(btrim(task_key)) between 1 and 200),
  kind text not null check (length(btrim(kind)) between 1 and 200),
  description text not null check (length(btrim(description)) between 1 and 2000),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'checkpointed', 'blocked', 'completed', 'failed', 'cancelled')),
  dependencies text[] not null default '{}'::text[],
  payload jsonb not null default '{}'::jsonb,
  result jsonb null,
  last_error text null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 1 and 200),
  available_at timestamptz not null default now(),
  lease_owner text null,
  lease_token uuid null,
  lease_expires_at timestamptz null,
  heartbeat_at timestamptz null,
  checkpoint_sequence integer not null default 0 check (checkpoint_sequence >= 0),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (objective_id, task_key),
  unique (objective_id, idempotency_key)
);

create table if not exists public.ark_checkpoints (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.ark_objectives(id) on delete cascade,
  task_id uuid not null references public.ark_tasks(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  state jsonb not null default '{}'::jsonb,
  next_action text not null check (length(btrim(next_action)) between 1 and 2000),
  reason text not null check (reason in ('budget', 'interruption', 'dependency', 'executor')),
  created_at timestamptz not null default now(),
  unique (task_id, sequence)
);

create table if not exists public.ark_events (
  id bigint generated always as identity primary key,
  objective_id uuid not null references public.ark_objectives(id) on delete cascade,
  task_id uuid null references public.ark_tasks(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ark_tasks_claim_idx
  on public.ark_tasks (status, available_at, created_at)
  where status in ('queued', 'checkpointed', 'running');
create index if not exists ark_tasks_objective_status_idx
  on public.ark_tasks (objective_id, status, task_key);
create index if not exists ark_objectives_owner_status_idx
  on public.ark_objectives (user_id, project_id, status, priority desc, created_at);
create index if not exists ark_events_objective_idx
  on public.ark_events (objective_id, id);

alter table public.ark_objectives enable row level security;
alter table public.ark_tasks enable row level security;
alter table public.ark_checkpoints enable row level security;
alter table public.ark_events enable row level security;

create policy "ark_objectives_select_own"
on public.ark_objectives for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ark_tasks_select_own"
on public.ark_tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ark_checkpoints_select_own"
on public.ark_checkpoints for select to authenticated
using (
  exists (
    select 1 from public.ark_objectives o
    where o.id = objective_id and o.user_id = (select auth.uid())
  )
);

create policy "ark_events_select_own"
on public.ark_events for select to authenticated
using (
  exists (
    select 1 from public.ark_objectives o
    where o.id = objective_id and o.user_id = (select auth.uid())
  )
);

create or replace function public.ark_enqueue_objective(
  p_user_id uuid,
  p_project_id uuid,
  p_goal text,
  p_priority integer,
  p_budget jsonb,
  p_idempotency_key text,
  p_tasks jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_objective public.ark_objectives;
  v_task jsonb;
  v_request_hash text;
begin
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then
    raise exception 'ark_objective_requires_tasks' using errcode = '22023';
  end if;
  if jsonb_array_length(p_tasks) > 500 then
    raise exception 'ark_objective_task_limit' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = p_user_id
  ) then
    raise exception 'ark_project_owner_mismatch' using errcode = '42501';
  end if;
  if coalesce(p_priority, 0) not between -100 and 100 then
    raise exception 'ark_invalid_priority' using errcode = '22023';
  end if;
  if coalesce((p_budget->>'maxTasksPerCycle')::integer, 8) not between 1 and 100
    or coalesce((p_budget->>'maxRuntimeMs')::integer, 25000) not between 1000 and 300000
    or coalesce((p_budget->>'maxAttemptsPerTask')::integer, 3) not between 1 and 20
  then
    raise exception 'ark_invalid_budget' using errcode = '22023';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'goal', p_goal,
    'priority', coalesce(p_priority, 0),
    'budget', jsonb_build_object(
      'maxTasksPerCycle', coalesce((p_budget->>'maxTasksPerCycle')::integer, 8),
      'maxRuntimeMs', coalesce((p_budget->>'maxRuntimeMs')::integer, 25000),
      'maxAttemptsPerTask', coalesce((p_budget->>'maxAttemptsPerTask')::integer, 3)
    ),
    'tasks', p_tasks
  )::text);

  insert into public.ark_objectives (
    user_id, project_id, goal, priority, budget, idempotency_key, request_hash
  ) values (
    p_user_id,
    p_project_id,
    p_goal,
    coalesce(p_priority, 0),
    jsonb_build_object(
      'maxTasksPerCycle', coalesce((p_budget->>'maxTasksPerCycle')::integer, 8),
      'maxRuntimeMs', coalesce((p_budget->>'maxRuntimeMs')::integer, 25000),
      'maxAttemptsPerTask', coalesce((p_budget->>'maxAttemptsPerTask')::integer, 3)
    ),
    p_idempotency_key,
    v_request_hash
  )
  on conflict (user_id, project_id, idempotency_key) do nothing
  returning * into v_objective;

  if v_objective.id is null then
    select * into v_objective
    from public.ark_objectives
    where user_id = p_user_id
      and project_id = p_project_id
      and idempotency_key = p_idempotency_key;
    if v_objective.request_hash <> v_request_hash then
      raise exception 'ark_idempotency_payload_mismatch' using errcode = '22023';
    end if;
    return to_jsonb(v_objective);
  end if;

  for v_task in select value from jsonb_array_elements(p_tasks)
  loop
    insert into public.ark_tasks (
      objective_id, user_id, project_id, task_key, kind, description,
      dependencies, payload, max_attempts, idempotency_key
    ) values (
      v_objective.id,
      p_user_id,
      p_project_id,
      v_task->>'task_key',
      v_task->>'kind',
      v_task->>'description',
      coalesce(array(select jsonb_array_elements_text(v_task->'dependencies')), '{}'::text[]),
      coalesce(v_task->'payload', '{}'::jsonb),
      coalesce((v_task->>'max_attempts')::integer, (v_objective.budget->>'maxAttemptsPerTask')::integer, 3),
      v_task->>'idempotency_key'
    )
    on conflict (objective_id, task_key) do nothing;
  end loop;

  insert into public.ark_events (objective_id, event_type, payload)
  values (v_objective.id, 'objective_enqueued', jsonb_build_object('idempotencyKey', p_idempotency_key));

  return to_jsonb(v_objective);
end;
$$;

create or replace function public.ark_claim_next_task(
  p_worker_id text,
  p_lease_ms integer,
  p_now timestamptz,
  p_excluded_objective_ids uuid[] default '{}'::uuid[]
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

create or replace function public.ark_heartbeat_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_ms integer,
  p_now timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if p_lease_ms < 1000 or p_lease_ms > 3600000 then
    raise exception 'ark_invalid_lease_duration' using errcode = '22023';
  end if;
  update public.ark_tasks
  set heartbeat_at = p_now,
      lease_expires_at = p_now + make_interval(secs => p_lease_ms::double precision / 1000),
      version = version + 1,
      updated_at = p_now
  where id = p_task_id and status = 'running'
    and lease_owner = p_worker_id and lease_token = p_lease_token
    and lease_expires_at > p_now;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

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

create or replace function public.ark_complete_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_result jsonb,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_task public.ark_tasks;
  v_objective public.ark_objectives;
begin
  update public.ark_tasks
  set status = 'completed', result = p_result, last_error = null,
      lease_owner = null, lease_token = null, lease_expires_at = null, heartbeat_at = null,
      version = version + 1, updated_at = p_now
  where id = p_task_id and status = 'running'
    and lease_owner = p_worker_id and lease_token = p_lease_token
    and lease_expires_at > p_now
  returning * into v_task;
  if v_task.id is null then raise exception 'ark_lease_lost' using errcode = '40001'; end if;

  update public.ark_objectives o
  set status = case
        when not exists (select 1 from public.ark_tasks t where t.objective_id = o.id and t.status <> 'completed')
          then 'awaiting_verification'
        else 'running'
      end,
      version = version + 1,
      updated_at = p_now
  where o.id = v_task.objective_id
  returning * into v_objective;

  insert into public.ark_events (objective_id, task_id, event_type, payload)
  values (v_task.objective_id, v_task.id, 'task_completed', jsonb_build_object('attempt', v_task.attempt_count));
  return jsonb_build_object('objective', to_jsonb(v_objective), 'task', to_jsonb(v_task));
end;
$$;

create or replace function public.ark_block_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_blocker jsonb,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_task public.ark_tasks;
  v_objective public.ark_objectives;
begin
  update public.ark_tasks
  set status = 'blocked', result = jsonb_build_object('blocker', p_blocker),
      lease_owner = null, lease_token = null, lease_expires_at = null, heartbeat_at = null,
      version = version + 1, updated_at = p_now
  where id = p_task_id and status = 'running'
    and lease_owner = p_worker_id and lease_token = p_lease_token
    and lease_expires_at > p_now
  returning * into v_task;
  if v_task.id is null then raise exception 'ark_lease_lost' using errcode = '40001'; end if;

  update public.ark_objectives
  set status = 'blocked', blocker = p_blocker, version = version + 1, updated_at = p_now
  where id = v_task.objective_id returning * into v_objective;

  insert into public.ark_events (objective_id, task_id, event_type, payload)
  values (v_task.objective_id, v_task.id, 'task_blocked', p_blocker);
  return jsonb_build_object('objective', to_jsonb(v_objective), 'task', to_jsonb(v_task));
end;
$$;

create or replace function public.ark_fail_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_error text,
  p_retry_at timestamptz,
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_task public.ark_tasks;
  v_objective public.ark_objectives;
  v_retry boolean;
begin
  select * into v_task from public.ark_tasks
  where id = p_task_id and status = 'running'
    and lease_owner = p_worker_id and lease_token = p_lease_token
    and lease_expires_at > p_now
  for update;
  if v_task.id is null then raise exception 'ark_lease_lost' using errcode = '40001'; end if;
  v_retry := p_retry_at is not null and v_task.attempt_count < v_task.max_attempts;

  update public.ark_tasks
  set status = case when v_retry then 'queued' else 'failed' end,
      last_error = left(coalesce(p_error, 'ark_executor_failed'), 1000),
      available_at = case when v_retry then p_retry_at else available_at end,
      lease_owner = null, lease_token = null, lease_expires_at = null, heartbeat_at = null,
      version = version + 1, updated_at = p_now
  where id = p_task_id returning * into v_task;

  update public.ark_objectives
  set status = case when v_retry then 'queued' else 'failed' end,
      blocker = case when v_retry then null else jsonb_build_object('kind', 'task_failed', 'message', 'ARK task attempts exhausted') end,
      version = version + 1, updated_at = p_now
  where id = v_task.objective_id returning * into v_objective;

  insert into public.ark_events (objective_id, task_id, event_type, payload)
  values (v_task.objective_id, v_task.id, case when v_retry then 'task_retry_scheduled' else 'task_failed' end,
    jsonb_build_object('attempt', v_task.attempt_count, 'retryAt', p_retry_at));
  return jsonb_build_object('objective', to_jsonb(v_objective), 'task', to_jsonb(v_task));
end;
$$;

create or replace function public.ark_verify_objective(
  p_objective_id uuid,
  p_ok boolean,
  p_evidence jsonb,
  p_unresolved_work text[],
  p_now timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_objective public.ark_objectives;
begin
  select * into v_objective from public.ark_objectives
  where id = p_objective_id for update;
  if v_objective.id is null then raise exception 'ark_objective_not_found' using errcode = 'P0002'; end if;
  if v_objective.status <> 'awaiting_verification' then
    raise exception 'ark_objective_not_awaiting_verification' using errcode = '40001';
  end if;
  if exists (select 1 from public.ark_tasks where objective_id = p_objective_id and status <> 'completed') then
    raise exception 'ark_objective_has_unfinished_tasks' using errcode = '40001';
  end if;

  update public.ark_objectives
  set status = case when p_ok then 'completed' else 'blocked' end,
      completion_evidence = case when p_ok then p_evidence else null end,
      blocker = case when p_ok then null else jsonb_build_object('kind', 'verification_failed', 'unresolvedWork', coalesce(to_jsonb(p_unresolved_work), '[]'::jsonb)) end,
      version = version + 1,
      updated_at = p_now
  where id = p_objective_id returning * into v_objective;

  insert into public.ark_events (objective_id, event_type, payload)
  values (p_objective_id, case when p_ok then 'objective_completed' else 'objective_verification_failed' end,
    jsonb_build_object('evidence', p_evidence, 'unresolvedWork', p_unresolved_work));
  return to_jsonb(v_objective);
end;
$$;

revoke all on function public.ark_enqueue_objective(uuid, uuid, text, integer, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.ark_enqueue_objective(uuid, uuid, text, integer, jsonb, text, jsonb) to service_role;

revoke insert, update, delete, truncate, references, trigger
  on public.ark_objectives, public.ark_tasks, public.ark_checkpoints, public.ark_events
  from anon, authenticated;
grant select on public.ark_objectives, public.ark_tasks, public.ark_checkpoints, public.ark_events
  to authenticated;
grant all on public.ark_objectives, public.ark_tasks, public.ark_checkpoints, public.ark_events
  to service_role;
revoke update, delete, truncate on public.ark_checkpoints, public.ark_events
  from service_role;
grant usage, select on sequence public.ark_events_id_seq to service_role;

revoke all on function public.ark_claim_next_task(text, integer, timestamptz, uuid[]) from public, anon, authenticated;
revoke all on function public.ark_heartbeat_task(uuid, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.ark_checkpoint_task(uuid, text, uuid, integer, jsonb, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.ark_complete_task(uuid, text, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.ark_block_task(uuid, text, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.ark_fail_task(uuid, text, uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.ark_verify_objective(uuid, boolean, jsonb, text[], timestamptz) from public, anon, authenticated;

grant execute on function public.ark_claim_next_task(text, integer, timestamptz, uuid[]) to service_role;
grant execute on function public.ark_heartbeat_task(uuid, text, uuid, integer, timestamptz) to service_role;
grant execute on function public.ark_checkpoint_task(uuid, text, uuid, integer, jsonb, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.ark_complete_task(uuid, text, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.ark_block_task(uuid, text, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.ark_fail_task(uuid, text, uuid, text, timestamptz, timestamptz) to service_role;
grant execute on function public.ark_verify_objective(uuid, boolean, jsonb, text[], timestamptz) to service_role;

-- END supabase/migrations/20260918143000_create_ark_autonomous_work_runner.sql

-- BEGIN supabase/migrations/20260918203000_ark_targeted_objective_claim.sql
-- Add targeted ARK claims so an interactive bridge can execute one durable
-- objective without consuming or changing unrelated queued or expired work.

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

revoke all on function public.ark_claim_next_task(text, integer, timestamptz, uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.ark_claim_next_task(text, integer, timestamptz, uuid[], uuid)
  to service_role;

-- END supabase/migrations/20260918203000_ark_targeted_objective_claim.sql

-- BEGIN supabase/migrations/20260918210000_ark_owner_integrity.sql
-- Tighten ARK ownership and causal-link integrity at the database layer.
-- Service-role code must not be able to accidentally pair a user's objective
-- with another user's project/task simply because RLS is bypassed.

create unique index if not exists projects_id_user_id_ark_owner_idx
  on public.projects (id, user_id);

create unique index if not exists ark_objectives_id_owner_idx
  on public.ark_objectives (id, user_id, project_id);

create unique index if not exists ark_tasks_id_objective_idx
  on public.ark_tasks (id, objective_id);

alter table public.ark_objectives
  add constraint ark_objectives_project_owner_fk
  foreign key (project_id, user_id)
  references public.projects (id, user_id)
  on delete cascade;

alter table public.ark_tasks
  add constraint ark_tasks_objective_owner_fk
  foreign key (objective_id, user_id, project_id)
  references public.ark_objectives (id, user_id, project_id)
  on delete cascade;

alter table public.ark_checkpoints
  add constraint ark_checkpoints_task_objective_fk
  foreign key (task_id, objective_id)
  references public.ark_tasks (id, objective_id)
  on delete cascade;

alter table public.ark_events
  add constraint ark_events_task_objective_fk
  foreign key (task_id, objective_id)
  references public.ark_tasks (id, objective_id)
  on delete cascade;

-- END supabase/migrations/20260918210000_ark_owner_integrity.sql
