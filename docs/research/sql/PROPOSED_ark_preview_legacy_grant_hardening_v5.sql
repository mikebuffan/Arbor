-- PROPOSED PREVIEW HARDENING CANDIDATE ONLY. DO NOT AUTO-RUN.
-- Built from a read-only 2026-10-01 ARK Preview audit.
-- This file is intentionally NOT wired into CI or any migration path because it
-- targets already-deployed legacy tables/functions and needs app regression review.

-- Tables currently RLS-enabled with no client policies: make service-only intent explicit.
revoke all privileges on table
  public.app_users,
  public.ar_event_log,
  public.ar_memory_candidates,
  public.ar_memory_reinforcement,
  public.ar_phrase_counts,
  public.ar_topic_segments,
  public.billing_customers,
  public.billing_subscriptions,
  public.conversation_summaries,
  public.memories,
  public.safety_signals,
  public.safety_state,
  public.system_heartbeats,
  public.system_jobs,
  public.system_locks,
  public.system_rules,
  public.topic_stats,
  public.trace_logs,
  public.usage_daily,
  public.user_profile
from anon, authenticated;

grant all privileges on table
  public.app_users,
  public.ar_event_log,
  public.ar_memory_candidates,
  public.ar_memory_reinforcement,
  public.ar_phrase_counts,
  public.ar_topic_segments,
  public.billing_customers,
  public.billing_subscriptions,
  public.conversation_summaries,
  public.memories,
  public.safety_signals,
  public.safety_state,
  public.system_heartbeats,
  public.system_jobs,
  public.system_locks,
  public.system_rules,
  public.topic_stats,
  public.trace_logs,
  public.usage_daily,
  public.user_profile
to service_role;

-- These helpers currently target RLS-denied service tables; do not advertise them to clients.
revoke all on function public.ar_add_topic_segment(uuid,uuid,uuid,uuid,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.ar_add_topic_segment(uuid,uuid,uuid,uuid,text,integer,integer)
  to service_role;

revoke all on function public.ar_reinforce_candidate(uuid,uuid,uuid,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.ar_reinforce_candidate(uuid,uuid,uuid,uuid,text,jsonb)
  to service_role;

-- ARK queue reads are authenticated-owner scoped; anonymous role has no policy and
-- sampled visibility is already zero. Revoke its redundant table grants.
revoke select on table
  public.ark_objectives,
  public.ark_tasks,
  public.ark_checkpoints,
  public.ark_events
from anon;

-- Pattern Hop is authenticated-owner scoped. Remove redundant anonymous grants.
revoke all privileges on table
  public.arbor_pattern_hop_runs,
  public.arbor_pattern_hop_evidence,
  public.arbor_pattern_hop_edges
from anon;

-- DO NOT include ALTER EXTENSION vector SET SCHEMA here. First inventory
-- dependencies and qualified public.vector references.
--
-- DO NOT change leaked-password protection here. That is an Auth project setting.
--
-- Before any application:
-- 1. exercise app login/session flows;
-- 2. verify authenticated owner reads/writes still work;
-- 3. verify service-role workers still work;
-- 4. verify anon receives expected permission-denied behavior;
-- 5. capture grants/policies/function ACLs before and after;
-- 6. prepare a forward rollback migration restoring only the privileges proven necessary.
