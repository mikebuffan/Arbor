-- PROPOSAL ONLY. Source/disposable review first; not in migrations.
-- Durable run contract for "hand Arbor the reins" project-history research.
-- V1 source scope is intentionally limited to the owner's existing Arbor/project
-- history. Public investigation documents remain behind their separate gate.

create table if not exists public.arbor_research_reins_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  session_id uuid not null,
  ark_objective_id uuid not null references public.ark_objectives(id) on delete cascade,
  client_request_id uuid not null,
  request_hash text not null,
  source_scope text not null default 'project_history'
    check (source_scope in ('project_history')),
  authorization_version text not null
    check (length(btrim(authorization_version)) between 1 and 100),
  status text not null default 'active'
    check (status in ('active','stopped','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arbor_research_reins_session_owner_fk
    foreign key (session_id,user_id,project_id)
    references public.arbor_research_sessions(id,user_id,project_id)
    on delete cascade,
  constraint arbor_research_reins_project_owner_fk
    foreign key (project_id,user_id)
    references public.projects(id,user_id)
    on delete cascade,
  constraint arbor_research_reins_session_unique unique (session_id),
  constraint arbor_research_reins_objective_unique unique (ark_objective_id),
  constraint arbor_research_reins_request_unique
    unique (user_id,project_id,client_request_id)
);

alter table public.arbor_research_reins_runs enable row level security;
revoke all on public.arbor_research_reins_runs from public,anon,authenticated;
grant select on public.arbor_research_reins_runs to authenticated;
grant all on public.arbor_research_reins_runs to service_role;

drop policy if exists arbor_research_reins_owner_read
  on public.arbor_research_reins_runs;
create policy arbor_research_reins_owner_read
on public.arbor_research_reins_runs
for select to authenticated
using (user_id=(select auth.uid()));

create or replace function public.arbor_start_research_reins_run(
  p_user_id uuid,
  p_project_id uuid,
  p_client_request_id uuid,
  p_goal text,
  p_duration_minutes integer,
  p_max_work_units integer,
  p_max_cost_cents integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_goal text := btrim(coalesce(p_goal,''));
  v_hash text;
  v_existing public.arbor_research_reins_runs%rowtype;
  v_session public.arbor_research_sessions%rowtype;
  v_ark jsonb;
  v_objective_id uuid;
  v_run public.arbor_research_reins_runs%rowtype;
  v_authorization_version text := 'reins-project-history-v1';
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'research_reins_service_role_required';
  end if;

  if p_client_request_id is null
     or p_user_id is null
     or p_project_id is null
     or length(v_goal) not between 2 and 4000
     or p_duration_minutes not between 1 and 240
     or p_max_work_units not between 1 and 1000
     or p_max_cost_cents not between 0 and 1000000 then
    raise exception 'research_reins_invalid_contract';
  end if;

  if not exists (
    select 1 from public.projects
    where id=p_project_id and user_id=p_user_id
  ) then
    raise exception 'research_reins_project_owner_mismatch';
  end if;

  v_hash:=md5(jsonb_build_object(
    'goal',v_goal,
    'durationMinutes',p_duration_minutes,
    'maxWorkUnits',p_max_work_units,
    'maxCostCents',p_max_cost_cents,
    'sourceScope','project_history',
    'authorizationVersion',v_authorization_version
  )::text);

  select * into v_existing
  from public.arbor_research_reins_runs
  where user_id=p_user_id
    and project_id=p_project_id
    and client_request_id=p_client_request_id;

  if v_existing.id is not null then
    if v_existing.request_hash <> v_hash then
      raise exception 'research_reins_idempotency_payload_mismatch';
    end if;
    select * into v_session
    from public.arbor_research_sessions
    where id=v_existing.session_id
      and user_id=p_user_id
      and project_id=p_project_id;

    return jsonb_build_object(
      'accepted',true,
      'replayed',true,
      'runId',v_existing.id,
      'sessionId',v_existing.session_id,
      'objectiveId',v_existing.ark_objective_id,
      'deadlineAt',v_session.deadline_at,
      'sourceScope',v_existing.source_scope,
      'authorizationVersion',v_existing.authorization_version,
      'executionStarted',false
    );
  end if;

  insert into public.arbor_research_sessions (
    user_id,project_id,objective,status,
    started_at,deadline_at,
    max_work_units,consumed_work_units,
    max_cost_cents,committed_cost_cents,
    authorized,cancellation_requested,
    unresolved_required_work,completed_evidence_refs
  ) values (
    p_user_id,p_project_id,v_goal,'queued',
    v_now,v_now+make_interval(mins=>p_duration_minutes),
    p_max_work_units,0,
    p_max_cost_cents,0,
    true,false,
    0,'{}'::text[]
  )
  returning * into v_session;

  v_ark:=public.ark_enqueue_objective(
    p_user_id,
    p_project_id,
    v_goal,
    0,
    jsonb_build_object(
      'maxTasksPerCycle',1,
      'maxRuntimeMs',20000,
      'maxAttemptsPerTask',12
    ),
    'research-reins:'||p_client_request_id::text,
    jsonb_build_array(
      jsonb_build_object(
        'task_key','controller',
        'kind','research.controller.tick',
        'description','Run one bounded Arbor research controller pulse',
        'dependencies',jsonb_build_array(),
        'payload',jsonb_build_object('sessionId',v_session.id),
        'max_attempts',12,
        'idempotency_key',
          'research-reins:'||p_client_request_id::text||':controller'
      )
    )
  );

  v_objective_id:=(v_ark->>'id')::uuid;
  if v_objective_id is null then
    raise exception 'research_reins_ark_enqueue_failed';
  end if;

  insert into public.arbor_research_reins_runs (
    user_id,project_id,session_id,ark_objective_id,
    client_request_id,request_hash,source_scope,
    authorization_version,status
  ) values (
    p_user_id,p_project_id,v_session.id,v_objective_id,
    p_client_request_id,v_hash,'project_history',
    v_authorization_version,'active'
  )
  returning * into v_run;

  return jsonb_build_object(
    'accepted',true,
    'replayed',false,
    'runId',v_run.id,
    'sessionId',v_session.id,
    'objectiveId',v_objective_id,
    'deadlineAt',v_session.deadline_at,
    'sourceScope',v_run.source_scope,
    'authorizationVersion',v_run.authorization_version,
    'executionStarted',false
  );
end $$;

create or replace function public.arbor_load_research_reins_binding(
  p_run_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.arbor_research_reins_runs%rowtype;
  v_session public.arbor_research_sessions%rowtype;
  v_objective public.ark_objectives%rowtype;
  v_task public.ark_tasks%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'research_reins_service_role_required';
  end if;

  select * into v_run
  from public.arbor_research_reins_runs
  where id=p_run_id;

  if v_run.id is null then return null; end if;

  select * into v_session
  from public.arbor_research_sessions
  where id=v_run.session_id
    and user_id=v_run.user_id
    and project_id=v_run.project_id;

  select * into v_objective
  from public.ark_objectives
  where id=v_run.ark_objective_id
    and user_id=v_run.user_id
    and project_id=v_run.project_id;

  select * into v_task
  from public.ark_tasks
  where objective_id=v_run.ark_objective_id
    and user_id=v_run.user_id
    and project_id=v_run.project_id
    and task_key='controller'
    and kind='research.controller.tick';

  if v_session.id is null
     or v_objective.id is null
     or v_task.id is null then
    raise exception 'research_reins_binding_corrupt';
  end if;

  return jsonb_build_object(
    'runId',v_run.id,
    'runStatus',v_run.status,
    'userId',v_run.user_id,
    'projectId',v_run.project_id,
    'sessionId',v_run.session_id,
    'objectiveId',v_run.ark_objective_id,
    'taskId',v_task.id,
    'taskStatus',v_task.status,
    'objectiveStatus',v_objective.status,
    'sourceScope',v_run.source_scope,
    'authorizationVersion',v_run.authorization_version,
    'sessionAuthorized',v_session.authorized,
    'cancellationRequested',v_session.cancellation_requested,
    'startedAt',v_session.started_at,
    'deadlineAt',v_session.deadline_at,
    'maxWorkUnits',v_session.max_work_units,
    'consumedWorkUnits',v_session.consumed_work_units,
    'maxCostCents',v_session.max_cost_cents,
    'committedCostCents',v_session.committed_cost_cents
  );
end $$;

revoke all on function public.arbor_start_research_reins_run
  (uuid,uuid,uuid,text,integer,integer,integer)
  from public,anon,authenticated;
grant execute on function public.arbor_start_research_reins_run
  (uuid,uuid,uuid,text,integer,integer,integer)
  to service_role;

revoke all on function public.arbor_load_research_reins_binding(uuid)
  from public,anon,authenticated;
grant execute on function public.arbor_load_research_reins_binding(uuid)
  to service_role;
