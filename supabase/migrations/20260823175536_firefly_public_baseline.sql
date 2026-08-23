


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


-- `supabase db dump` omits extension DDL, but this baseline references
-- public.vector and Firefly has the vector extension installed in public.
-- Do not pin the extension version; Supabase installs the supported default.
DO $arbor_vector_baseline$
DECLARE
    vector_schema text;
BEGIN
    SELECT n.nspname
      INTO vector_schema
      FROM pg_catalog.pg_extension e
      JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
     WHERE e.extname = 'vector';

    IF vector_schema IS NULL THEN
        EXECUTE 'CREATE EXTENSION vector WITH SCHEMA public';
    ELSIF vector_schema <> 'public' THEN
        EXECUTE 'ALTER EXTENSION vector SET SCHEMA public';
    END IF;
END
$arbor_vector_baseline$;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."episode_status" AS ENUM (
    'open',
    'closed',
    'summarized',
    'archived'
);


ALTER TYPE "public"."episode_status" OWNER TO "postgres";


CREATE TYPE "public"."memory_type" AS ENUM (
    'identity',
    'preference',
    'communication',
    'project',
    'fact',
    'episode',
    'other'
);


ALTER TYPE "public"."memory_type" OWNER TO "postgres";


CREATE TYPE "public"."safety_risk_tier" AS ENUM (
    'none',
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."safety_risk_tier" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ar_add_topic_segment"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_message_id" "uuid", "p_topic" "text", "p_token_count" integer, "p_turn_index" integer) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  insert into public.ar_topic_segments(user_id, project_id, thread_id, message_id, topic, token_count, turn_index)
  values (p_user_id, p_project_id, p_thread_id, p_message_id, p_topic, coalesce(p_token_count,0), coalesce(p_turn_index,0))
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."ar_add_topic_segment"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_message_id" "uuid", "p_topic" "text", "p_token_count" integer, "p_turn_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ar_reinforce_candidate"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_candidate_id" "uuid", "p_decision" "text", "p_details" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  insert into public.ar_memory_reinforcement(user_id, project_id, thread_id, candidate_id, decision, details)
  values (p_user_id, p_project_id, p_thread_id, p_candidate_id, p_decision, coalesce(p_details,'{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."ar_reinforce_candidate"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_candidate_id" "uuid", "p_decision" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_usage_turn"("p_user_id" "text") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  insert into public.usage_daily (user_id, day, turns)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set
    turns = public.usage_daily.turns + 1,
    updated_at = now();
$$;


ALTER FUNCTION "public"."bump_usage_turn"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_messages"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  delete from public.messages
  where expires_at is not null
    and expires_at < now();
$$;


ALTER FUNCTION "public"."cleanup_expired_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_memories"("p_user_id" "uuid", "p_project_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer DEFAULT 24) RETURNS TABLE("id" "uuid", "key" "text", "value" "jsonb", "tier" "text", "scope" "text", "importance" integer, "pinned" boolean, "locked" boolean, "last_seen_at" timestamp with time zone, "created_at" timestamp with time zone, "similarity" real, "content_text" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    m.id,
    m.key,
    m.value,
    m.tier,
    m.scope,
    m.importance,
    m.pinned,
    m.locked,
    m.last_seen_at,
    m.created_at,
    (1 - (m.embedding <=> p_query_embedding))::float4 as similarity,
    (m.key || ': ' ||
      coalesce(
        nullif(m.value->>'content',''),
        left(m.value::text, 900)
      )
    ) as content_text
  from public.memory_items m
  where
    m.user_id = p_user_id
    and (m.project_id is not distinct from p_project_id)
    and m.status = 'active'
    and m.excluded_from_memory = false
    and m.deleted_at is null
    and m.embedding is not null
  order by m.embedding <=> p_query_embedding asc
  limit p_match_count;
$$;


ALTER FUNCTION "public"."match_memories"("p_user_id" "uuid", "p_project_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_memory_items"("p_include_user_trigger_only" boolean, "p_match_count" integer, "p_query_embedding" "public"."vector", "p_tiers" "text"[], "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "key" "text", "value" "jsonb", "tier" "text", "scope" "text", "importance" integer, "pinned" boolean, "locked" boolean, "last_seen_at" timestamp with time zone, "created_at" timestamp with time zone, "similarity" real, "content_text" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    m.id,
    m.key,
    m.value,
    m.tier,
    m.scope,
    m.importance,
    m.pinned,
    m.locked,
    m.last_seen_at,
    m.created_at,
    (1 - (m.embedding <=> p_query_embedding))::float4 as similarity,
    (
      m.key || ': ' ||
      coalesce(
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
  order by m.embedding <=> p_query_embedding asc
  limit greatest(1, p_match_count);
$$;


ALTER FUNCTION "public"."match_memory_items"("p_include_user_trigger_only" boolean, "p_match_count" integer, "p_query_embedding" "public"."vector", "p_tiers" "text"[], "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_memories"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.memory_items
  set
    last_seen_at = now(),
    mention_count = coalesce(mention_count, 0) + 1,
    updated_at = now()
  where id = any(p_ids);
$$;


ALTER FUNCTION "public"."touch_memories"("p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_memory_strength"("p_delta" double precision, "p_memory_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update memory_items
  set
    strength = greatest(least(strength + p_delta, 1.0), 0.0),
    updated_at = now()
  where id = p_memory_id;
end;
$$;


ALTER FUNCTION "public"."update_memory_strength"("p_delta" double precision, "p_memory_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ar_event_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_event_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ar_memory_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid",
    "candidate_json" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'proposed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_memory_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ar_memory_reinforcement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid",
    "candidate_id" "uuid",
    "decision" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_memory_reinforcement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ar_topic_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "topic" "text",
    "token_count" integer DEFAULT 0,
    "turn_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_topic_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_customers" (
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription_status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "price_id" "text",
    "current_period_end" timestamp with time zone,
    CONSTRAINT "billing_customers_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'past_due'::"text", 'canceled'::"text", 'unpaid'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'paused'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "user_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "stripe_subscription_id" "text",
    "status" "text" NOT NULL,
    "price_id" "text",
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "storage_bucket" "text" DEFAULT 'chat-attachments'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "attachment_kind" "text" NOT NULL,
    "status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "safe_filename" "text" NOT NULL,
    "upload_intent_expires_at" timestamp with time zone DEFAULT ("now"() + '00:20:00'::interval) NOT NULL,
    "uploaded_at" timestamp with time zone,
    "delete_reason" "text",
    CONSTRAINT "chat_attachments_attachment_kind_check" CHECK (("attachment_kind" = ANY (ARRAY['image'::"text", 'file'::"text"]))),
    CONSTRAINT "chat_attachments_bucket_check" CHECK (("storage_bucket" = 'chat-attachments'::"text")),
    CONSTRAINT "chat_attachments_kind_check" CHECK (("attachment_kind" = ANY (ARRAY['image'::"text", 'file'::"text"]))),
    CONSTRAINT "chat_attachments_size_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 10485760))),
    CONSTRAINT "chat_attachments_status_check" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'uploaded'::"text", 'failed'::"text", 'deleted'::"text"]))),
    CONSTRAINT "chat_attachments_storage_path_attachment_scope" CHECK (("storage_path" ~~ (((((((("user_id")::"text" || '/'::"text") || ("project_id")::"text") || '/'::"text") || ("conversation_id")::"text") || '/'::"text") || ("id")::"text") || '/%'::"text"))),
    CONSTRAINT "chat_attachments_storage_path_conversation_scope" CHECK (("storage_path" ~~ (((((("user_id")::"text" || '/'::"text") || ("project_id")::"text") || '/'::"text") || ("conversation_id")::"text") || '/%'::"text"))),
    CONSTRAINT "chat_attachments_storage_path_project_scope" CHECK (("storage_path" ~~ (((("user_id")::"text" || '/'::"text") || ("project_id")::"text") || '/%'::"text"))),
    CONSTRAINT "chat_attachments_storage_path_user_prefix" CHECK (("storage_path" ~~ (("user_id")::"text" || '/%'::"text")))
);


ALTER TABLE "public"."chat_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_import_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_index" integer NOT NULL,
    "message_index" integer NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error" "text",
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversation_import_chunks_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"]))),
    CONSTRAINT "conversation_import_chunks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'skipped'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."conversation_import_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "source" "text" DEFAULT 'chatgpt'::"text" NOT NULL,
    "status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "stats" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversation_imports_status_check" CHECK (("status" = ANY (ARRAY['uploaded'::"text", 'queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."conversation_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "summary" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."decision_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "conversation_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "severity_score" integer DEFAULT 0 NOT NULL,
    "risk_band" "text",
    "emotional_intensity" "text",
    "flags" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "action_taken" "text" DEFAULT 'none'::"text" NOT NULL,
    "model" "text",
    "postcheck_approved" boolean
);


ALTER TABLE "public"."decision_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."episodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid" NOT NULL,
    "status" "public"."episode_status" DEFAULT 'open'::"public"."episode_status" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "summary_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."episodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "conversation_id" "uuid",
    "kind" "text" NOT NULL,
    "subject" "text",
    "value" "jsonb" NOT NULL,
    "importance" integer DEFAULT 5 NOT NULL,
    "sensitivity" "text" DEFAULT 'normal'::"text" NOT NULL,
    "confidence" real DEFAULT 0.75 NOT NULL,
    "source" "text" DEFAULT 'auto'::"text" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."memories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "conversation_id" "uuid",
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tier" "text" DEFAULT 'normal'::"text" NOT NULL,
    "scope" "text" DEFAULT 'conversation'::"text" NOT NULL,
    "user_trigger_only" boolean DEFAULT false NOT NULL,
    "importance" integer DEFAULT 5 NOT NULL,
    "confidence" numeric DEFAULT 0.75 NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "mention_count" integer DEFAULT 0 NOT NULL,
    "correction_count" integer DEFAULT 0 NOT NULL,
    "last_seen_at" timestamp with time zone,
    "last_reinforced_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "excluded_from_memory" boolean DEFAULT false NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "delete_reason" "text",
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memory_items_v2_scope_check" CHECK (("scope" = ANY (ARRAY['global'::"text", 'project'::"text", 'conversation'::"text"]))),
    CONSTRAINT "memory_items_v2_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'tombstoned'::"text"]))),
    CONSTRAINT "memory_items_v2_tier_check" CHECK (("tier" = ANY (ARRAY['core'::"text", 'normal'::"text", 'sensitive'::"text"])))
);


ALTER TABLE "public"."memory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memory_items_legacy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "mem_key" "text" NOT NULL,
    "mem_value" "text" NOT NULL,
    "display_text" "text" NOT NULL,
    "trigger_terms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "emotional_weight" "text" DEFAULT 'neutral'::"text" NOT NULL,
    "relational_context" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "reveal_policy" "text" DEFAULT 'normal'::"text" NOT NULL,
    "strength" numeric DEFAULT 1.0 NOT NULL,
    "last_reinforced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "correction_count" integer DEFAULT 0 NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "repair_flag" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "discarded_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "key" "text",
    "value" "jsonb",
    "tier" "text" DEFAULT 'normal'::"text",
    "user_trigger_only" boolean DEFAULT false,
    "importance" integer DEFAULT 8,
    "confidence" numeric DEFAULT 0.95,
    "locked" boolean DEFAULT false,
    "mention_count" integer DEFAULT 1,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536),
    "scope" "text" DEFAULT 'conversation'::"text",
    "kind" "text",
    "decay_days" integer,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "memory_items_emotional_weight_check" CHECK (("emotional_weight" = ANY (ARRAY['light'::"text", 'neutral'::"text", 'heavy'::"text"]))),
    CONSTRAINT "memory_items_reveal_policy_check" CHECK (("reveal_policy" = ANY (ARRAY['always'::"text", 'normal'::"text", 'user_trigger_only'::"text", 'never'::"text"]))),
    CONSTRAINT "memory_items_reveal_policy_check1" CHECK (("reveal_policy" = ANY (ARRAY['normal'::"text", 'user_trigger_only'::"text", 'never'::"text"]))),
    CONSTRAINT "memory_items_scope_check1" CHECK (("scope" = ANY (ARRAY['global'::"text", 'project'::"text", 'conversation'::"text"])))
);


ALTER TABLE "public"."memory_items_legacy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memory_pending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "question" "text" DEFAULT ''::"text",
    "ops" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "memory_key" "text",
    "event_type" "text",
    "payload" "jsonb"
);


ALTER TABLE "public"."memory_pending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "project_id" "uuid" NOT NULL,
    "episode_id" "uuid",
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'Default Project'::"text" NOT NULL,
    "persona_id" "text" DEFAULT 'arbor'::"text" NOT NULL,
    "framework_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "persona" "text" DEFAULT 'default'::"text",
    "description" "text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."safety_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "distress_level" integer NOT NULL,
    "self_harm_signal" boolean NOT NULL,
    "crisis_signal" boolean NOT NULL,
    "intent_or_plan" boolean NOT NULL,
    "confidence" double precision NOT NULL,
    "reason_short" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."safety_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."safety_state" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid" NOT NULL,
    "tier" "public"."safety_risk_tier" DEFAULT 'none'::"public"."safety_risk_tier" NOT NULL,
    "last_escalation_at" timestamp with time zone,
    "clarify_pending" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."safety_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_heartbeats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" NOT NULL,
    "processed_users" integer DEFAULT 0,
    "notes" "text"
);


ALTER TABLE "public"."system_heartbeats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "next_run_at" timestamp with time zone,
    "last_error" "text"
);


ALTER TABLE "public"."system_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "locked_at" timestamp with time zone DEFAULT "now"(),
    "released_at" timestamp with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."system_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_key" "text" NOT NULL,
    "description" "text",
    "rule_json" "jsonb" NOT NULL,
    "weight" numeric DEFAULT 1.0,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "topic" "text" NOT NULL,
    "weight" numeric DEFAULT 0,
    "time_spent_s" numeric DEFAULT 0,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trace_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "thread_id" "uuid",
    "episode_id" "uuid",
    "logic_gates_hit" "text"[] DEFAULT ARRAY[]::"text"[],
    "proof_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "retrieval_latency_ms" integer,
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trace_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_daily" (
    "user_id" "text" NOT NULL,
    "day" "date" NOT NULL,
    "turns" integer DEFAULT 0 NOT NULL,
    "tokens_in" integer DEFAULT 0 NOT NULL,
    "tokens_out" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usage_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_memory_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" DEFAULT 'session'::"text" NOT NULL,
    "summary" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "soothers" "text"[] DEFAULT '{}'::"text"[],
    "soft_triggers" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_memory_summaries_kind_check" CHECK (("kind" = ANY (ARRAY['session'::"text", 'daily'::"text", 'project'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."user_memory_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_prefs" (
    "user_id" "uuid" NOT NULL,
    "preferred_name" "text",
    "language" "text" DEFAULT 'auto'::"text",
    "tone_preset" "text" DEFAULT 'balanced'::"text",
    "humor_level" "text" DEFAULT 'medium'::"text",
    "challenge_default" "text" DEFAULT 'off'::"text",
    "likes_pop_culture" boolean DEFAULT false,
    "pop_culture_likes" "text"[] DEFAULT '{}'::"text"[],
    "pop_culture_dislikes" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_prefs_challenge_default_check" CHECK (("challenge_default" = ANY (ARRAY['off'::"text", 'on'::"text"]))),
    CONSTRAINT "user_prefs_humor_level_check" CHECK (("humor_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'spicy'::"text"]))),
    CONSTRAINT "user_prefs_language_check" CHECK (("language" = ANY (ARRAY['auto'::"text", 'en'::"text", 'es'::"text"]))),
    CONSTRAINT "user_prefs_tone_preset_check" CHECK (("tone_preset" = ANY (ARRAY['gentle'::"text", 'balanced'::"text", 'direct'::"text"])))
);


ALTER TABLE "public"."user_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "user_id" "text" NOT NULL,
    "persona_variant" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_working_context" (
    "user_id" "uuid" NOT NULL,
    "capacity_level" smallint,
    "today_context" "text",
    "current_projects" "text"[] DEFAULT '{}'::"text"[],
    "current_stressors" "text"[] DEFAULT '{}'::"text"[],
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_working_context_capacity_level_check" CHECK (("capacity_level" = ANY (ARRAY[10, 30, 60, 80])))
);


ALTER TABLE "public"."user_working_context" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_system_health" AS
 SELECT "date_trunc"('hour'::"text", "created_at") AS "hour_bucket",
    "count"(*) AS "traces",
    "avg"("retrieval_latency_ms") AS "avg_retrieval_latency_ms",
    "percentile_cont"((0.95)::double precision) WITHIN GROUP (ORDER BY (("retrieval_latency_ms")::double precision)) AS "p95_retrieval_latency_ms"
   FROM "public"."trace_logs"
  GROUP BY ("date_trunc"('hour'::"text", "created_at"))
  ORDER BY ("date_trunc"('hour'::"text", "created_at")) DESC;


ALTER VIEW "public"."view_system_health" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_event_log"
    ADD CONSTRAINT "ar_event_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_memory_candidates"
    ADD CONSTRAINT "ar_memory_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_memory_reinforcement"
    ADD CONSTRAINT "ar_memory_reinforcement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_topic_segments"
    ADD CONSTRAINT "ar_topic_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."chat_attachments"
    ADD CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_import_chunks"
    ADD CONSTRAINT "conversation_import_chunks_import_id_thread_index_message_i_key" UNIQUE ("import_id", "thread_index", "message_index");



ALTER TABLE ONLY "public"."conversation_import_chunks"
    ADD CONSTRAINT "conversation_import_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_imports"
    ADD CONSTRAINT "conversation_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."decision_outcomes"
    ADD CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memory_items_legacy"
    ADD CONSTRAINT "memory_items_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memory_items"
    ADD CONSTRAINT "memory_items_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memory_items"
    ADD CONSTRAINT "memory_items_v2_user_id_key_key" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."memory_pending"
    ADD CONSTRAINT "memory_pending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_signals"
    ADD CONSTRAINT "safety_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_state"
    ADD CONSTRAINT "safety_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_state"
    ADD CONSTRAINT "safety_state_user_id_project_id_thread_id_key" UNIQUE ("user_id", "project_id", "thread_id");



ALTER TABLE ONLY "public"."system_heartbeats"
    ADD CONSTRAINT "system_heartbeats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_jobs"
    ADD CONSTRAINT "system_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_locks"
    ADD CONSTRAINT "system_locks_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."system_locks"
    ADD CONSTRAINT "system_locks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_rules"
    ADD CONSTRAINT "system_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_rules"
    ADD CONSTRAINT "system_rules_rule_key_key" UNIQUE ("rule_key");



ALTER TABLE ONLY "public"."topic_stats"
    ADD CONSTRAINT "topic_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_stats"
    ADD CONSTRAINT "topic_stats_user_id_project_id_topic_key" UNIQUE ("user_id", "project_id", "topic");



ALTER TABLE ONLY "public"."trace_logs"
    ADD CONSTRAINT "trace_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_daily"
    ADD CONSTRAINT "usage_daily_pkey" PRIMARY KEY ("user_id", "day");



ALTER TABLE ONLY "public"."user_memory_summaries"
    ADD CONSTRAINT "user_memory_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_working_context"
    ADD CONSTRAINT "user_working_context_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "billing_customers_status_idx" ON "public"."billing_customers" USING "btree" ("subscription_status");



CREATE INDEX "billing_customers_user_id_idx" ON "public"."billing_customers" USING "btree" ("user_id");



CREATE INDEX "chat_attachments_conversation_created_idx" ON "public"."chat_attachments" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "chat_attachments_conversation_idx" ON "public"."chat_attachments" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "chat_attachments_project_created_idx" ON "public"."chat_attachments" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "chat_attachments_project_idx" ON "public"."chat_attachments" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "chat_attachments_status_expires_idx" ON "public"."chat_attachments" USING "btree" ("status", "upload_intent_expires_at");



CREATE UNIQUE INDEX "chat_attachments_storage_path_uidx" ON "public"."chat_attachments" USING "btree" ("storage_bucket", "storage_path") WHERE ("deleted_at" IS NULL);



CREATE INDEX "chat_attachments_user_created_idx" ON "public"."chat_attachments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "conversation_summaries_user_convo" ON "public"."conversation_summaries" USING "btree" ("user_id", "conversation_id", "created_at" DESC);



CREATE INDEX "conversations_project_id_idx" ON "public"."conversations" USING "btree" ("project_id");



CREATE INDEX "conversations_user_id_idx" ON "public"."conversations" USING "btree" ("user_id");



CREATE INDEX "conversations_user_project_idx" ON "public"."conversations" USING "btree" ("user_id", "project_id");



CREATE INDEX "idx_ar_event_log_user_thread_created" ON "public"."ar_event_log" USING "btree" ("user_id", "thread_id", "created_at");



CREATE INDEX "idx_ar_memory_candidates_user_project_status" ON "public"."ar_memory_candidates" USING "btree" ("user_id", "project_id", "status", "created_at");



CREATE INDEX "idx_ar_memory_reinforcement_user_thread_created" ON "public"."ar_memory_reinforcement" USING "btree" ("user_id", "thread_id", "created_at");



CREATE INDEX "idx_ar_topic_segments_user_thread_created" ON "public"."ar_topic_segments" USING "btree" ("user_id", "thread_id", "created_at");



CREATE INDEX "idx_billing_subscriptions_customer" ON "public"."billing_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_decision_outcomes_convo_created" ON "public"."decision_outcomes" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_decision_outcomes_project_created" ON "public"."decision_outcomes" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "idx_decision_outcomes_user_created" ON "public"."decision_outcomes" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_episodes_user_closed" ON "public"."episodes" USING "btree" ("user_id", "closed_at" DESC);



CREATE INDEX "idx_import_chunks_pending" ON "public"."conversation_import_chunks" USING "btree" ("import_id", "status", "thread_index", "message_index");



CREATE INDEX "idx_memory_items_embedding_hnsw" ON "public"."memory_items" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_memory_items_user_last_seen" ON "public"."memory_items" USING "btree" ("user_id", "last_seen_at" DESC);



CREATE INDEX "idx_memory_items_user_project" ON "public"."memory_items" USING "btree" ("user_id", "project_id", "updated_at" DESC);



CREATE INDEX "idx_safety_state_user_thread" ON "public"."safety_state" USING "btree" ("user_id", "thread_id");



CREATE INDEX "idx_system_jobs_status" ON "public"."system_jobs" USING "btree" ("status");



CREATE INDEX "idx_system_rules_enabled" ON "public"."system_rules" USING "btree" ("enabled");



CREATE INDEX "idx_system_rules_json" ON "public"."system_rules" USING "gin" ("rule_json");



CREATE INDEX "idx_topic_stats_last_seen" ON "public"."topic_stats" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_topic_stats_user_weight" ON "public"."topic_stats" USING "btree" ("user_id", "weight" DESC);



CREATE INDEX "idx_trace_logs_created_at" ON "public"."trace_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_trace_logs_proof_snapshot" ON "public"."trace_logs" USING "gin" ("proof_snapshot");



CREATE INDEX "idx_trace_logs_retrieval_latency" ON "public"."trace_logs" USING "btree" ("retrieval_latency_ms");



CREATE INDEX "idx_user_memory_summaries_tags" ON "public"."user_memory_summaries" USING "gin" ("tags");



CREATE INDEX "idx_user_memory_summaries_user_id_created_at" ON "public"."user_memory_summaries" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "memories_conversation_id_idx" ON "public"."memories" USING "btree" ("conversation_id");



CREATE INDEX "memories_kind_idx" ON "public"."memories" USING "btree" ("kind");



CREATE INDEX "memories_project_id_idx" ON "public"."memories" USING "btree" ("project_id");



CREATE INDEX "memories_user_id_idx" ON "public"."memories" USING "btree" ("user_id");



CREATE UNIQUE INDEX "memory_items_anchor_mem_key_uniq" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "mem_key") WHERE (("mem_key" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "memory_items_deleted_at_idx" ON "public"."memory_items_legacy" USING "btree" ("deleted_at");



CREATE INDEX "memory_items_embedding_hnsw" ON "public"."memory_items_legacy" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "memory_items_embedding_idx" ON "public"."memory_items_legacy" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "memory_items_mem_key_idx" ON "public"."memory_items_legacy" USING "btree" ("mem_key");



CREATE UNIQUE INDEX "memory_items_uniq_user_project_key" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "mem_key");



CREATE UNIQUE INDEX "memory_items_uniq_user_project_key_v2" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "key");



CREATE INDEX "memory_items_user_project_confirmed_idx" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "confirmed_at");



CREATE INDEX "memory_items_user_project_discarded_idx" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "discarded_at");



CREATE INDEX "memory_items_user_project_idx" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id");



CREATE INDEX "memory_items_user_project_pinned_idx" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "pinned");



CREATE INDEX "memory_items_user_project_scope_idx" ON "public"."memory_items_legacy" USING "btree" ("user_id", "project_id", "scope");



CREATE INDEX "memory_items_v2_embedding_ivfflat" ON "public"."memory_items" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "memory_items_v2_user_scope_idx" ON "public"."memory_items" USING "btree" ("user_id", "scope");



CREATE INDEX "memory_items_v2_user_status_idx" ON "public"."memory_items" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "memory_items_v2_user_tier_idx" ON "public"."memory_items" USING "btree" ("user_id", "tier");



CREATE INDEX "memory_pending_user_idx" ON "public"."memory_pending" USING "btree" ("user_id");



CREATE INDEX "memory_pending_user_project_idx" ON "public"."memory_pending" USING "btree" ("user_id", "project_id", "created_at" DESC);



CREATE INDEX "messages_conversation_id_idx" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "messages_convo_time_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "messages_project_id_idx" ON "public"."messages" USING "btree" ("project_id");



CREATE INDEX "messages_user_id_idx" ON "public"."messages" USING "btree" ("user_id");



CREATE INDEX "projects_user_id_idx" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "projects_user_idx" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "safety_signals_user_time" ON "public"."safety_signals" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "uniq_pinned_key_per_scope" ON "public"."memory_items" USING "btree" ("user_id", COALESCE("project_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "key") WHERE ("pinned" = true);



CREATE OR REPLACE TRIGGER "trg_memory_items_updated" BEFORE UPDATE ON "public"."memory_items_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_prefs_updated_at" BEFORE UPDATE ON "public"."user_prefs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_working_updated_at" BEFORE UPDATE ON "public"."user_working_context" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."chat_attachments"
    ADD CONSTRAINT "chat_attachments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."chat_attachments"
    ADD CONSTRAINT "chat_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."chat_attachments"
    ADD CONSTRAINT "chat_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversation_import_chunks"
    ADD CONSTRAINT "conversation_import_chunks_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."conversation_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_import_chunks"
    ADD CONSTRAINT "conversation_import_chunks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."conversation_import_chunks"
    ADD CONSTRAINT "conversation_import_chunks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversation_imports"
    ADD CONSTRAINT "conversation_imports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."conversation_imports"
    ADD CONSTRAINT "conversation_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memory_items"
    ADD CONSTRAINT "memory_items_v2_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memory_items"
    ADD CONSTRAINT "memory_items_v2_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memory_items"
    ADD CONSTRAINT "memory_items_v2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_episode_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trace_logs"
    ADD CONSTRAINT "trace_logs_episode_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_memory_summaries"
    ADD CONSTRAINT "user_memory_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_working_context"
    ADD CONSTRAINT "user_working_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_event_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_memory_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_memory_reinforcement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_topic_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat attachments delete own metadata" ON "public"."chat_attachments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "chat attachments insert own metadata" ON "public"."chat_attachments" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("storage_path" ~~ (("auth"."uid"())::"text" || '/%'::"text"))));



CREATE POLICY "chat attachments select own metadata" ON "public"."chat_attachments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "chat_attachments"."project_id") AND ("p"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "chat_attachments"."conversation_id") AND ("c"."user_id" = "auth"."uid"()) AND ("c"."project_id" = "chat_attachments"."project_id"))))));



CREATE POLICY "chat attachments update own metadata" ON "public"."chat_attachments" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("storage_bucket" = 'chat-attachments'::"text") AND ("storage_path" ~~ (("auth"."uid"())::"text" || '/%'::"text"))));



ALTER TABLE "public"."chat_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_import_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_import_chunks_own" ON "public"."conversation_import_chunks" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conversation_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_imports_own" ON "public"."conversation_imports" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conversation_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_delete_own" ON "public"."conversations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "conversations_insert_own" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "conversations_select_own" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "conversations_update_own" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."decision_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."episodes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "episodes_insert_own" ON "public"."episodes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "episodes_select_own" ON "public"."episodes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "episodes_update_own" ON "public"."episodes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."memories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memory_items_delete_own" ON "public"."memory_items_legacy" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_insert_own" ON "public"."memory_items_legacy" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."memory_items_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memory_items_select_own" ON "public"."memory_items_legacy" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_update_own" ON "public"."memory_items_legacy" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_v2_delete_own" ON "public"."memory_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_v2_insert_own" ON "public"."memory_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_v2_select_own" ON "public"."memory_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "memory_items_v2_update_own" ON "public"."memory_items" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."memory_pending" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memory_pending_rw_own" ON "public"."memory_pending" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete_own" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "messages_insert_own" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "messages_select_own" ON "public"."messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "messages_update_own" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "prefs_insert_own" ON "public"."user_prefs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "prefs_select_own" ON "public"."user_prefs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "prefs_update_own" ON "public"."user_prefs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete_own" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "projects_insert_own" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "projects_select_own" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "projects_update_own" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "read_own_decision_outcomes" ON "public"."decision_outcomes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."safety_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_state" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "summaries_delete_own" ON "public"."user_memory_summaries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "summaries_insert_own" ON "public"."user_memory_summaries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "summaries_select_own" ON "public"."user_memory_summaries" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."system_heartbeats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_locks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trace_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_memory_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_working_context" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_insert_own" ON "public"."user_working_context" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "working_select_own" ON "public"."user_working_context" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "working_update_own" ON "public"."user_working_context" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."ar_add_topic_segment"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_message_id" "uuid", "p_topic" "text", "p_token_count" integer, "p_turn_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."ar_add_topic_segment"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_message_id" "uuid", "p_topic" "text", "p_token_count" integer, "p_turn_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ar_add_topic_segment"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_message_id" "uuid", "p_topic" "text", "p_token_count" integer, "p_turn_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ar_reinforce_candidate"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_candidate_id" "uuid", "p_decision" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."ar_reinforce_candidate"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_candidate_id" "uuid", "p_decision" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ar_reinforce_candidate"("p_user_id" "uuid", "p_project_id" "uuid", "p_thread_id" "uuid", "p_candidate_id" "uuid", "p_decision" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_usage_turn"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bump_usage_turn"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_usage_turn"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_memories"("p_user_id" "uuid", "p_project_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_memories"("p_user_id" "uuid", "p_project_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_memories"("p_user_id" "uuid", "p_project_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_memory_items"("p_include_user_trigger_only" boolean, "p_match_count" integer, "p_query_embedding" "public"."vector", "p_tiers" "text"[], "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_memory_items"("p_include_user_trigger_only" boolean, "p_match_count" integer, "p_query_embedding" "public"."vector", "p_tiers" "text"[], "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_memory_items"("p_include_user_trigger_only" boolean, "p_match_count" integer, "p_query_embedding" "public"."vector", "p_tiers" "text"[], "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_memories"("p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."touch_memories"("p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_memories"("p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_memory_strength"("p_delta" double precision, "p_memory_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_memory_strength"("p_delta" double precision, "p_memory_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_memory_strength"("p_delta" double precision, "p_memory_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."ar_event_log" TO "anon";
GRANT ALL ON TABLE "public"."ar_event_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_event_log" TO "service_role";



GRANT ALL ON TABLE "public"."ar_memory_candidates" TO "anon";
GRANT ALL ON TABLE "public"."ar_memory_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_memory_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."ar_memory_reinforcement" TO "anon";
GRANT ALL ON TABLE "public"."ar_memory_reinforcement" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_memory_reinforcement" TO "service_role";



GRANT ALL ON TABLE "public"."ar_topic_segments" TO "anon";
GRANT ALL ON TABLE "public"."ar_topic_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_topic_segments" TO "service_role";



GRANT ALL ON TABLE "public"."billing_customers" TO "anon";
GRANT ALL ON TABLE "public"."billing_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."chat_attachments" TO "anon";
GRANT ALL ON TABLE "public"."chat_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_import_chunks" TO "anon";
GRANT ALL ON TABLE "public"."conversation_import_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_import_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_imports" TO "anon";
GRANT ALL ON TABLE "public"."conversation_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_imports" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_summaries" TO "anon";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."decision_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."decision_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."decision_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."episodes" TO "anon";
GRANT ALL ON TABLE "public"."episodes" TO "authenticated";
GRANT ALL ON TABLE "public"."episodes" TO "service_role";



GRANT ALL ON TABLE "public"."memories" TO "anon";
GRANT ALL ON TABLE "public"."memories" TO "authenticated";
GRANT ALL ON TABLE "public"."memories" TO "service_role";



GRANT ALL ON TABLE "public"."memory_items" TO "anon";
GRANT ALL ON TABLE "public"."memory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_items" TO "service_role";



GRANT ALL ON TABLE "public"."memory_items_legacy" TO "anon";
GRANT ALL ON TABLE "public"."memory_items_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_items_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."memory_pending" TO "anon";
GRANT ALL ON TABLE "public"."memory_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_pending" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."safety_signals" TO "anon";
GRANT ALL ON TABLE "public"."safety_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_signals" TO "service_role";



GRANT ALL ON TABLE "public"."safety_state" TO "anon";
GRANT ALL ON TABLE "public"."safety_state" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_state" TO "service_role";



GRANT ALL ON TABLE "public"."system_heartbeats" TO "anon";
GRANT ALL ON TABLE "public"."system_heartbeats" TO "authenticated";
GRANT ALL ON TABLE "public"."system_heartbeats" TO "service_role";



GRANT ALL ON TABLE "public"."system_jobs" TO "anon";
GRANT ALL ON TABLE "public"."system_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."system_locks" TO "anon";
GRANT ALL ON TABLE "public"."system_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."system_locks" TO "service_role";



GRANT ALL ON TABLE "public"."system_rules" TO "anon";
GRANT ALL ON TABLE "public"."system_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."system_rules" TO "service_role";



GRANT ALL ON TABLE "public"."topic_stats" TO "anon";
GRANT ALL ON TABLE "public"."topic_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_stats" TO "service_role";



GRANT ALL ON TABLE "public"."trace_logs" TO "anon";
GRANT ALL ON TABLE "public"."trace_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."trace_logs" TO "service_role";



GRANT ALL ON TABLE "public"."usage_daily" TO "anon";
GRANT ALL ON TABLE "public"."usage_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_daily" TO "service_role";



GRANT ALL ON TABLE "public"."user_memory_summaries" TO "anon";
GRANT ALL ON TABLE "public"."user_memory_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memory_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."user_prefs" TO "anon";
GRANT ALL ON TABLE "public"."user_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_working_context" TO "anon";
GRANT ALL ON TABLE "public"."user_working_context" TO "authenticated";
GRANT ALL ON TABLE "public"."user_working_context" TO "service_role";



GRANT ALL ON TABLE "public"."view_system_health" TO "anon";
GRANT ALL ON TABLE "public"."view_system_health" TO "authenticated";
GRANT ALL ON TABLE "public"."view_system_health" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
