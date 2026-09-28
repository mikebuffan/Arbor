create or replace function public.arbor_save_continuity_snapshot(
  p_user_id uuid,
  p_project_id uuid,
  p_conversation_id uuid,
  p_channel text,
  p_active_subsystem text,
  p_current_goal text,
  p_last_meaningful_user_turn text,
  p_last_meaningful_arbor_turn text,
  p_unresolved_work text[] default '{}'::text[],
  p_corrections jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_now timestamptz := now();
  v_state jsonb;
  v_agency jsonb;
begin
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = p_user_id
  ) then
    raise exception 'arbor_project_owner_mismatch' using errcode = '42501';
  end if;

  if p_channel not in ('text','voice') then
    raise exception 'arbor_invalid_channel' using errcode = '22023';
  end if;

  if p_active_subsystem not in ('arbor','annabelle') then
    raise exception 'arbor_invalid_subsystem' using errcode = '22023';
  end if;

  if jsonb_typeof(p_corrections) <> 'array' then
    raise exception 'arbor_invalid_corrections' using errcode = '22023';
  end if;

  if coalesce(array_length(p_unresolved_work, 1), 0) > 50 then
    raise exception 'arbor_unresolved_work_limit' using errcode = '22023';
  end if;

  v_agency := case
    when coalesce(array_length(p_unresolved_work, 1), 0) > 0 then
      jsonb_build_object(
        'goal', coalesce(p_current_goal, 'Continue current Arbor work'),
        'status', 'active',
        'currentStep', 0,
        'unresolvedWork', to_jsonb(p_unresolved_work),
        'recurringWeaknesses', jsonb_build_array(),
        'strategyNotes', jsonb_build_array(),
        'blocker', null,
        'attemptedActionIds', jsonb_build_array(),
        'lastVerification', null
      )
    else null
  end;

  v_state := jsonb_build_object(
    'schemaVersion', 1,
    'userId', p_user_id,
    'projectId', p_project_id,
    'conversationId', p_conversation_id,
    'channel', p_channel,
    'activeSubsystem', p_active_subsystem,
    'currentGoal', p_current_goal,
    'lastMeaningfulUserTurn', p_last_meaningful_user_turn,
    'lastMeaningfulArborTurn', p_last_meaningful_arbor_turn,
    'agency', v_agency,
    'corrections', p_corrections,
    'behaviorProof', null,
    'pendingSelfUpdate', null,
    'createdAt', v_now,
    'updatedAt', v_now
  );

  insert into public.arbor_conversation_state (
    user_id, project_id, conversation_id, state, updated_at
  ) values (
    p_user_id, p_project_id, p_conversation_id, v_state, v_now
  )
  on conflict (user_id, project_id, conversation_id)
  do update set
    state = excluded.state,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'saved', true,
    'projectId', p_project_id,
    'conversationId', p_conversation_id,
    'updatedAt', v_now
  );
end;
$function$;

revoke all on function public.arbor_save_continuity_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text[], jsonb
) from public, anon, authenticated;
grant execute on function public.arbor_save_continuity_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text[], jsonb
) to service_role;
