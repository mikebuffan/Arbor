-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Requires v1/v2/v3 proposed research schemas first.
-- No real-source ingestion, worker activation, scheduler, publication, or paid API.

create table if not exists public.arbor_research_replay_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  recipe_key text not null,
  recipe_sha256 text not null check (recipe_sha256 ~ '^[0-9a-f]{64}$'),
  canonical_recipe_json jsonb not null check (jsonb_typeof(canonical_recipe_json)='object'),
  code_version text not null,
  status text not null default 'replayable_recipe_not_finding',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,recipe_key),
  unique(owner_id,project_id,recipe_sha256)
);

create table if not exists public.arbor_research_evidence_packets_v4 (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  packet_key text not null,
  finding_ref text not null,
  title text not null,
  replay_recipe_sha256 text not null check (replay_recipe_sha256 ~ '^[0-9a-f]{64}$'),
  sources jsonb not null check (jsonb_typeof(sources)='array'),
  limitations jsonb not null check (jsonb_typeof(limitations)='array'),
  unresolved_questions jsonb not null check (jsonb_typeof(unresolved_questions)='array'),
  privacy_flag_ids jsonb not null check (jsonb_typeof(privacy_flag_ids)='array'),
  original_page_review_complete boolean not null default false,
  status text not null default 'hold_for_human_evidence_packet_review',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,packet_key)
);

create table if not exists public.arbor_research_multilingual_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  record_key text not null,
  document_key text not null,
  source_language text not null,
  original_text text not null,
  status text not null default 'original_preserved_translation_secondary',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,record_key)
);

create table if not exists public.arbor_research_translation_segments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  multilingual_record_id uuid not null references public.arbor_research_multilingual_records(id) on delete restrict,
  segment_key text not null,
  source_text text not null,
  translated_text text not null,
  source_language text not null,
  target_language text not null,
  source_ref text not null,
  source_start_utf16 integer not null check (source_start_utf16 >= 0),
  source_end_utf16 integer not null check (source_end_utf16 > source_start_utf16),
  translator text not null,
  translator_version text,
  machine_confidence numeric check (machine_confidence is null or machine_confidence between 0 and 1),
  ambiguity_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(ambiguity_notes)='array'),
  human_review_status text not null check (human_review_status in ('unreviewed','reviewed','corrected')),
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,multilingual_record_id,segment_key)
);

create table if not exists public.arbor_research_scale_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  receipt_key text not null,
  total_pages bigint not null check (total_pages > 0),
  shard_pages integer not null check (shard_pages > 0),
  shard_count integer not null check (shard_count > 0),
  current_concurrency integer not null check (current_concurrency >= 0),
  current_batch_pages integer not null check (current_batch_pages > 0),
  queue_depth integer not null check (queue_depth >= 0),
  p95_latency_ms numeric not null check (p95_latency_ms >= 0),
  error_rate numeric not null check (error_rate between 0 and 1),
  memory_utilization numeric not null check (memory_utilization between 0 and 1),
  storage_budget_remaining_ratio numeric not null check (storage_budget_remaining_ratio between 0 and 1),
  decision text not null check (decision in ('increase','hold','decrease','pause')),
  reasons jsonb not null check (jsonb_typeof(reasons)='array'),
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,receipt_key)
);

create table if not exists public.arbor_research_stopping_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  receipt_key text not null,
  source_families_exhausted boolean not null,
  unresolved_contradiction_count integer not null check (unresolved_contradiction_count >= 0),
  unresolved_identity_count integer not null check (unresolved_identity_count >= 0),
  unresolved_required_work integer not null check (unresolved_required_work >= 0),
  coverage_ratios jsonb not null check (jsonb_typeof(coverage_ratios)='array'),
  rounds_without_new_evidence integer not null check (rounds_without_new_evidence >= 0),
  rounds_without_new_leads integer not null check (rounds_without_new_leads >= 0),
  minimum_stable_rounds integer not null check (minimum_stable_rounds > 0),
  completion_evidence_refs jsonb not null check (jsonb_typeof(completion_evidence_refs)='array'),
  decision text not null check (decision in ('continue','hold_for_manual_review','stop_exhausted')),
  reasons jsonb not null check (jsonb_typeof(reasons)='array'),
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,receipt_key)
);

alter table public.arbor_research_replay_receipts enable row level security;
alter table public.arbor_research_evidence_packets_v4 enable row level security;
alter table public.arbor_research_multilingual_records enable row level security;
alter table public.arbor_research_translation_segments enable row level security;
alter table public.arbor_research_scale_receipts enable row level security;
alter table public.arbor_research_stopping_receipts enable row level security;

drop trigger if exists arbor_research_replay_receipts_append_only on public.arbor_research_replay_receipts;
create trigger arbor_research_replay_receipts_append_only
before update or delete on public.arbor_research_replay_receipts
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_evidence_packets_v4_append_only on public.arbor_research_evidence_packets_v4;
create trigger arbor_research_evidence_packets_v4_append_only
before update or delete on public.arbor_research_evidence_packets_v4
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_multilingual_records_append_only on public.arbor_research_multilingual_records;
create trigger arbor_research_multilingual_records_append_only
before update or delete on public.arbor_research_multilingual_records
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_translation_segments_append_only on public.arbor_research_translation_segments;
create trigger arbor_research_translation_segments_append_only
before update or delete on public.arbor_research_translation_segments
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_scale_receipts_append_only on public.arbor_research_scale_receipts;
create trigger arbor_research_scale_receipts_append_only
before update or delete on public.arbor_research_scale_receipts
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_stopping_receipts_append_only on public.arbor_research_stopping_receipts;
create trigger arbor_research_stopping_receipts_append_only
before update or delete on public.arbor_research_stopping_receipts
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_replay_receipts is
  'Reproducible recipe receipts identify how a result was produced; they are not findings.';
comment on table public.arbor_research_evidence_packets_v4 is
  'Human-review evidence packets remain HOLD; packet assembly does not authorize release.';
comment on table public.arbor_research_multilingual_records is
  'Original-language text is canonical source material; translations are secondary aligned records.';
comment on table public.arbor_research_scale_receipts is
  'Backpressure decisions record bounded resource control for corpus processing.';
comment on table public.arbor_research_stopping_receipts is
  'Stopping decisions concern bounded research exhaustion only and never establish truth or innocence/guilt.';
