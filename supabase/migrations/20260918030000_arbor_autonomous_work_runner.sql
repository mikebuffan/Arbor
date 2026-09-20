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
