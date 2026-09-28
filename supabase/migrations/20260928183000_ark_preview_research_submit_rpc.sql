create or replace function public.ark_enqueue_preview_research(
  p_user_id uuid,
  p_project_id uuid,
  p_client_request_id uuid,
  p_seed text,
  p_objective text default null,
  p_conversation_id uuid default null,
  p_max_depth integer default 4,
  p_max_hops_per_attempt integer default 4
)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_idempotency_key text;
  v_goal text;
  v_objective jsonb;
begin
  if p_seed is null or length(p_seed) < 2 or length(p_seed) > 4000 then
    raise exception 'ark_preview_research_invalid_seed' using errcode = '22023';
  end if;

  if p_objective is not null and (length(p_objective) < 2 or length(p_objective) > 4000) then
    raise exception 'ark_preview_research_invalid_objective' using errcode = '22023';
  end if;

  if p_max_depth not between 1 and 6 then
    raise exception 'ark_preview_research_invalid_depth' using errcode = '22023';
  end if;

  if p_max_hops_per_attempt not between 1 and 8 then
    raise exception 'ark_preview_research_invalid_hops' using errcode = '22023';
  end if;

  if p_conversation_id is not null and not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.user_id = p_user_id
      and c.project_id = p_project_id
  ) then
    raise exception 'ark_conversation_owner_mismatch' using errcode = '42501';
  end if;

  v_idempotency_key := 'supabase-research:' || p_client_request_id::text;
  v_goal := coalesce(p_objective, 'Research: ' || p_seed);

  v_objective := public.ark_enqueue_objective(
    p_user_id,
    p_project_id,
    v_goal,
    0,
    jsonb_build_object(
      'maxTasksPerCycle', 1,
      'maxRuntimeMs', 20000,
      'maxAttemptsPerTask', 12
    ),
    v_idempotency_key,
    jsonb_build_array(
      jsonb_build_object(
        'task_key', 'research',
        'kind', 'ark.preview-research',
        'description', 'Run or resume bounded Arbor project-history pattern-hop research',
        'dependencies', jsonb_build_array(),
        'payload', jsonb_build_object(
          'seed', p_seed,
          'objective', p_objective,
          'conversationId', p_conversation_id,
          'maxDepth', p_max_depth,
          'maxHopsPerAttempt', p_max_hops_per_attempt
        ),
        'max_attempts', 12,
        'idempotency_key', v_idempotency_key || ':research'
      )
    )
  );

  return jsonb_build_object(
    'accepted', true,
    'objectiveId', v_objective->>'id',
    'status', v_objective->>'status',
    'executionStarted', false
  );
end;
$function$;

revoke all on function public.ark_enqueue_preview_research(
  uuid, uuid, uuid, text, text, uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.ark_enqueue_preview_research(
  uuid, uuid, uuid, text, text, uuid, integer, integer
) to service_role;
