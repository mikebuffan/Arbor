-- Isolate Arbor memory retrieval by exact scope.
--
-- Backward-compatible 4-argument retrieval intentionally excludes
-- conversation-scoped memory because it has no conversation identity.
-- The 5-argument overload admits conversation memory only when both project
-- and conversation ids match exactly.

create or replace function public.match_memories_v3(
  p_user_id uuid,
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 24
)
returns table (
  id uuid,
  user_id uuid,
  project_id uuid,
  conversation_id uuid,
  key text,
  value jsonb,
  tier text,
  scope text,
  user_trigger_only boolean,
  importance integer,
  confidence numeric,
  locked boolean,
  pinned boolean,
  status text,
  deleted_at timestamptz,
  last_seen_at timestamptz,
  last_reinforced_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
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
        and mi.project_id = p_project_id
      )
    )
  order by
    mi.embedding <=> p_query_embedding,
    mi.pinned desc,
    mi.importance desc
  limit greatest(1, least(coalesce(p_match_count, 24), 100));
$$;

create or replace function public.match_memories_v3(
  p_user_id uuid,
  p_project_id uuid,
  p_conversation_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 24
)
returns table (
  id uuid,
  user_id uuid,
  project_id uuid,
  conversation_id uuid,
  key text,
  value jsonb,
  tier text,
  scope text,
  user_trigger_only boolean,
  importance integer,
  confidence numeric,
  locked boolean,
  pinned boolean,
  status text,
  deleted_at timestamptz,
  last_seen_at timestamptz,
  last_reinforced_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
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
        and mi.project_id = p_project_id
      )
      or (
        mi.scope = 'conversation'
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
$$;

revoke all on function public.match_memories_v3(uuid, uuid, vector, integer) from public;
grant execute on function public.match_memories_v3(uuid, uuid, vector, integer) to authenticated;

revoke all on function public.match_memories_v3(uuid, uuid, uuid, vector, integer) from public;
grant execute on function public.match_memories_v3(uuid, uuid, uuid, vector, integer) to authenticated;
