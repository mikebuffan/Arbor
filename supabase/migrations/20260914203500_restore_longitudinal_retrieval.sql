-- Restore Arbor longitudinal retrieval:
-- 1) project-scoped semantic memory retrieval
-- 2) durable raw historical conversation corpus
-- 3) source lineage for staged imports

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
      or mi.project_id = p_project_id
    )
  order by
    mi.embedding <=> p_query_embedding,
    mi.pinned desc,
    mi.importance desc
  limit greatest(1, least(coalesce(p_match_count, 24), 100));
$$;

revoke all on function public.match_memories_v3(uuid, uuid, vector, integer) from public;
grant execute on function public.match_memories_v3(uuid, uuid, vector, integer) to authenticated;

create table if not exists public.historical_conversation_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  source text not null default 'chatgpt',
  source_thread_id text not null,
  source_message_id text not null,
  source_message_index integer null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  occurred_at timestamptz null,
  embedding vector(1536) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, source, source_message_id)
);

create index if not exists historical_conversation_turns_owner_idx
  on public.historical_conversation_turns(user_id, project_id);

create index if not exists historical_conversation_turns_thread_idx
  on public.historical_conversation_turns(user_id, project_id, source_thread_id);

create index if not exists historical_conversation_turns_occurred_idx
  on public.historical_conversation_turns(user_id, project_id, occurred_at desc);

create index if not exists historical_conversation_turns_position_idx
  on public.historical_conversation_turns(
    user_id,
    project_id,
    source_thread_id,
    source_message_index
  );

create index if not exists historical_conversation_turns_embedding_hnsw_idx
  on public.historical_conversation_turns
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.historical_conversation_turns enable row level security;

drop policy if exists historical_turns_select_own
  on public.historical_conversation_turns;

create policy historical_turns_select_own
on public.historical_conversation_turns
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.historical_conversation_turns from anon;
grant select on public.historical_conversation_turns to authenticated;
grant all on public.historical_conversation_turns to service_role;

drop function if exists public.match_historical_conversation_turns(
  uuid,
  uuid,
  vector,
  integer
);

create function public.match_historical_conversation_turns(
  p_user_id uuid,
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 12
)
returns table (
  id uuid,
  source text,
  source_thread_id text,
  source_message_id text,
  source_message_index integer,
  role text,
  content text,
  occurred_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    h.id,
    h.source,
    h.source_thread_id,
    h.source_message_id,
    h.source_message_index,
    h.role,
    h.content,
    h.occurred_at,
    (1 - (h.embedding <=> p_query_embedding))::double precision as similarity
  from public.historical_conversation_turns h
  where h.user_id = p_user_id
    and h.project_id = p_project_id
    and h.embedding is not null
  order by h.embedding <=> p_query_embedding
  limit greatest(1, least(coalesce(p_match_count, 12), 40));
$$;

revoke all on function public.match_historical_conversation_turns(uuid, uuid, vector, integer) from public;
grant execute on function public.match_historical_conversation_turns(uuid, uuid, vector, integer) to authenticated;

alter table public.conversation_import_chunks
  add column if not exists source_thread_id text null,
  add column if not exists source_message_id text null;

create index if not exists conversation_import_chunks_lineage_idx
  on public.conversation_import_chunks(import_id, thread_index, message_index);
