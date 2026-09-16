create or replace function public.match_historical_conversation_turns(
 p_user_id uuid,p_project_id uuid,p_query_embedding vector,p_match_count integer default 12
) returns table (
 id uuid,source text,source_thread_id text,source_message_id text,source_message_index integer,
 role text,content text,occurred_at timestamptz,similarity double precision
) language sql stable security invoker set search_path=public as $$
 select h.id,h.source,h.source_thread_id,h.source_message_id,h.source_message_index,h.role,h.content,h.occurred_at,
   case when h.embedding is null then 0::double precision else (1-(h.embedding <=> p_query_embedding))::double precision end
 from public.historical_conversation_turns h
 where h.user_id=p_user_id and h.project_id=p_project_id and h.embedding is not null
 order by h.embedding <=> p_query_embedding
 limit greatest(1,least(coalesce(p_match_count,12),50));
$$;
