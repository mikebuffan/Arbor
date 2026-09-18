-- Atomic compare-and-swap writer for Arbor runtime agency state.
-- The caller supplies the objective revision it hydrated. If another turn has
-- advanced the row, this function updates zero rows and reports a conflict.

create or replace function public.arbor_cas_agency_state(
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
  return affected = 1;
end;
$func$;

revoke all on function public.arbor_cas_agency_state(
  uuid, uuid, integer, text, text, integer, jsonb, jsonb, jsonb, text, jsonb
) from public;

grant execute on function public.arbor_cas_agency_state(
  uuid, uuid, integer, text, text, integer, jsonb, jsonb, jsonb, text, jsonb
) to authenticated;
