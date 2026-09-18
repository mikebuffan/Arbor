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
