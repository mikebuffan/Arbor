-- Backend closeout hardening

-- cleanup_expired_messages is intentionally privileged because it can remove
-- expired rows across users. It must never be callable from client roles.
alter function public.cleanup_expired_messages()
  set search_path = pg_catalog, public;

revoke all on function public.cleanup_expired_messages()
  from public, anon, authenticated;

grant execute on function public.cleanup_expired_messages()
  to service_role;

-- Pin search_path on public RPC/trigger functions so object resolution cannot
-- be redirected through a caller-controlled schema.
alter function public.ar_add_topic_segment(
  uuid, uuid, uuid, uuid, text, integer, integer
) set search_path = pg_catalog, public;

alter function public.ar_reinforce_candidate(
  uuid, uuid, uuid, uuid, text, jsonb
) set search_path = pg_catalog, public;

alter function public.match_memories(
  uuid, uuid, public.vector, integer
) set search_path = pg_catalog, public;

alter function public.touch_memories(uuid[])
  set search_path = pg_catalog, public;

alter function public.match_memory_items(
  boolean, integer, public.vector, text[], uuid
) set search_path = pg_catalog, public;

alter function public.set_updated_at()
  set search_path = pg_catalog, public;

-- This RPC targets the removed legacy memory_items.strength column.
-- Current Arbor reinforcement updates v2 mention_count directly.
drop function if exists public.update_memory_strength(
  double precision,
  uuid
);

-- This aggregate health view is internal telemetry. Make it invoker-safe and
-- remove direct client-role access.
alter view public.view_system_health
  set (security_invoker = true);

revoke all on table public.view_system_health
  from public, anon, authenticated;

grant select on table public.view_system_health
  to service_role;

-- FK support for live runtime/state paths. Composite primary keys beginning
-- with user_id do not efficiently support project_id FK checks by themselves.
create index if not exists arbor_runtime_state_project_id_idx
  on public.arbor_runtime_state(project_id);

create index if not exists arbor_conversation_state_project_id_idx
  on public.arbor_conversation_state(project_id);

create index if not exists arbor_agency_strategy_candidates_project_id_idx
  on public.arbor_agency_strategy_candidates(project_id);

create index if not exists arbor_timeline_events_project_id_idx
  on public.arbor_timeline_events(project_id);

create index if not exists annabelle_workspace_state_project_id_idx
  on public.annabelle_workspace_state(project_id);

create index if not exists annabelle_workspace_revisions_project_id_idx
  on public.annabelle_workspace_revisions(project_id);

create index if not exists memory_items_project_id_idx
  on public.memory_items(project_id);

create index if not exists memory_items_conversation_id_idx
  on public.memory_items(conversation_id);

create index if not exists messages_episode_id_idx
  on public.messages(episode_id);
