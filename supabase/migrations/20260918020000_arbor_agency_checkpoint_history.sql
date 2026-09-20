-- Append-only audit trail for durable agency checkpoints.

create table if not exists public.arbor_agency_checkpoints (
  checkpoint_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  objective_revision integer not null,
  agency_status text not null,
  current_step integer not null default 0,
  unresolved_work jsonb not null default '[]'::jsonb,
  objective jsonb null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists arbor_agency_checkpoints_project_created_idx
  on public.arbor_agency_checkpoints(user_id, project_id, created_at desc);

alter table public.arbor_agency_checkpoints enable row level security;

drop policy if exists arbor_agency_checkpoints_owner_select
  on public.arbor_agency_checkpoints;
create policy arbor_agency_checkpoints_owner_select
  on public.arbor_agency_checkpoints
  for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists arbor_agency_checkpoints_owner_insert
  on public.arbor_agency_checkpoints;
create policy arbor_agency_checkpoints_owner_insert
  on public.arbor_agency_checkpoints
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create or replace function public.arbor_record_agency_checkpoint(
  p_user_id uuid,
  p_project_id uuid,
  p_expected_revision integer,
  p_goal text,
  p_status text,
  p_current_step integer,
  p_unresolved_work jsonb,
  p_recurring_weaknesses jsonb,
  p_strategy_notes jsonb,
  p_blocker text,
  p_objective jsonb,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $func$
declare
  affected integer;
  next_revision integer := coalesce((p_objective->>'revision')::integer, 0);
begin
  update public.arbor_runtime_state
  set agency_goal = p_goal,
      agency_status = p_status,
      agency_current_step = p_current_step,
      agency_unresolved_work = coalesce(p_unresolved_work, '[]'::jsonb),
      agency_recurring_weaknesses = coalesce(p_recurring_weaknesses, '[]'::jsonb),
      agency_strategy_notes = coalesce(p_strategy_notes, '[]'::jsonb),
      agency_blocker = p_blocker,
      agency_objective = p_objective,
      updated_at = now()
  where user_id = p_user_id
    and project_id = p_project_id
    and coalesce((agency_objective->>'revision')::integer, 0) = p_expected_revision;

  get diagnostics affected = row_count;
  if affected <> 1 then return false; end if;

  insert into public.arbor_agency_checkpoints(
    user_id, project_id, objective_revision, agency_status,
    current_step, unresolved_work, objective, reason
  ) values (
    p_user_id, p_project_id, next_revision, p_status,
    p_current_step, coalesce(p_unresolved_work, '[]'::jsonb),
    p_objective, p_reason
  );
  return true;
end;
$func$;

revoke all on function public.arbor_record_agency_checkpoint(
 uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb,text,jsonb,text
) from public;
grant execute on function public.arbor_record_agency_checkpoint(
 uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb,text,jsonb,text
) to authenticated;
