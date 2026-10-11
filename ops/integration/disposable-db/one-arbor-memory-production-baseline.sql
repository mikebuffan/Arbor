-- SYNTHETIC disposable fixture only; never execute against a hosted database.
-- Exact function text read back from Firefly production pg_get_functiondef on 2026-10-10.
-- No production rows, JWTs, credentials or other user content copied.
CREATE OR REPLACE FUNCTION public.match_memories_v3(p_user_id uuid, p_project_id uuid, p_conversation_id uuid, p_query_embedding vector, p_match_count integer DEFAULT 24)
 RETURNS TABLE(id uuid, user_id uuid, project_id uuid, conversation_id uuid, key text, value jsonb, tier text, scope text, user_trigger_only boolean, importance integer, confidence numeric, locked boolean, pinned boolean, status text, deleted_at timestamp with time zone, last_seen_at timestamp with time zone, last_reinforced_at timestamp with time zone, updated_at timestamp with time zone, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    mi.id,
    mi.user_id,
    mi.project_id,
    mi.conversation_id,
    mi.key,
    mi.value,
    mi.tier,
    mi.scope,
    mi.user_trigger_only,
    mi.importance,
    mi.confidence,
    mi.locked,
    mi.pinned,
    mi.status,
    mi.deleted_at,
    mi.last_seen_at,
    mi.last_reinforced_at,
    mi.updated_at,
    (1 - (mi.embedding <=> p_query_embedding))::double precision as similarity
  from public.memory_items mi
  where mi.user_id = p_user_id
    and mi.status = 'active'
    and mi.deleted_at is null
    and mi.embedding is not null
    and (
      mi.scope = 'global'
      or (
        mi.scope = 'project'
        and p_project_id is not null
        and mi.project_id = p_project_id
      )
      or (
        mi.scope = 'conversation'
        and p_project_id is not null
        and p_conversation_id is not null
        and mi.project_id = p_project_id
        and mi.conversation_id = p_conversation_id
      )
    )
  order by
    mi.embedding <=> p_query_embedding,
    mi.pinned desc,
    mi.importance desc
  limit greatest(1, least(coalesce(p_match_count, 24), 100));
$function$

REVOKE ALL ON FUNCTION public.match_memories_v3(uuid,uuid,uuid,vector,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_memories_v3(uuid,uuid,uuid,vector,integer) TO anon, authenticated, service_role;
