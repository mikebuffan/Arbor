-- Restore query-aware memory retrieval while preserving strict runtime scope.
-- Replaces the legacy user-only vector RPC with project/conversation-aware semantics.

drop function if exists public.match_memory_items(
  boolean,
  integer,
  vector,
  text[],
  uuid
);

create or replace function public.match_memory_items(
  p_include_user_trigger_only boolean,
  p_match_count integer,
  p_project_id uuid,
  p_conversation_id uuid,
  p_query_embedding vector,
  p_tiers text[],
  p_user_id uuid
)
returns table(
  id uuid,
  project_id uuid,
  conversation_id uuid,
  key text,
  value jsonb,
  tier text,
  scope text,
  user_trigger_only boolean,
  importance integer,
  confidence numeric,
  pinned boolean,
  locked boolean,
  status text,
  deleted_at timestamptz,
  last_seen_at timestamptz,
  last_reinforced_at timestamptz,
  updated_at timestamptz,
  similarity real,
  content_text text
)
language sql
stable
set search_path to 'pg_catalog', 'public'
as $function$
  select
    m.id,
    m.project_id,
    m.conversation_id,
    m.key,
    m.value,
    m.tier,
    m.scope,
    m.user_trigger_only,
    m.importance,
    m.confidence,
    m.pinned,
    m.locked,
    m.status,
    m.deleted_at,
    m.last_seen_at,
    m.last_reinforced_at,
    m.updated_at,
    (1 - (m.embedding <=> p_query_embedding))::float4 as similarity,
    (
      m.key || ': ' ||
      coalesce(
        nullif(m.value->>'text',''),
        nullif(m.value->>'content',''),
        left(m.value::text, 900)
      )
    ) as content_text
  from public.memory_items m
  where
    m.user_id = p_user_id
    and m.status = 'active'
    and m.excluded_from_memory = false
    and m.deleted_at is null
    and m.embedding is not null
    and (
      p_tiers is null
      or array_length(p_tiers, 1) is null
      or m.tier = any(p_tiers)
    )
    and (
      p_include_user_trigger_only = true
      or m.user_trigger_only = false
    )
    and (
      m.scope = 'global'
      or (
        p_project_id is not null
        and m.scope = 'project'
        and m.project_id = p_project_id
      )
      or (
        p_project_id is not null
        and m.scope = 'conversation'
        and m.project_id = p_project_id
        and (
          m.conversation_id is null
          or (
            p_conversation_id is not null
            and m.conversation_id = p_conversation_id
          )
        )
      )
    )
  order by m.embedding <=> p_query_embedding asc
  limit greatest(1, least(coalesce(p_match_count, 40), 100));
$function$;
