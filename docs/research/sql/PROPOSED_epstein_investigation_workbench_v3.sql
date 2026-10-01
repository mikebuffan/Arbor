-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Requires ingestion/verification v1 and corpus intelligence v2 proposals first.
-- No worker, scheduler, real-source ingestion, biometric processing, publication, or release action.

create table if not exists public.arbor_research_thread_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  edge_key text not null,
  from_document_key text not null,
  to_document_key text not null,
  edge_type text not null check (edge_type in ('reply_to','forwards')),
  basis text not null,
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  status text not null default 'explicit_message_key_only',
  created_at timestamptz not null default now(),
  check (from_document_key <> to_document_key),
  unique(owner_id,project_id,edge_key)
);

create table if not exists public.arbor_research_visual_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  asset_key text not null,
  kind text not null check (kind in ('photograph','map','screenshot','scan','diagram','other')),
  document_key text not null,
  physical_page integer check (physical_page is null or physical_page > 0),
  original_bytes_sha256 text not null check (original_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  image_bytes_sha256 text not null check (image_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  exhibit_label text,
  caption_text text,
  created_at_source timestamptz,
  linked_testimony_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(linked_testimony_refs)='array'),
  review_status text not null default 'hold_for_visual_source_and_privacy_review',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,asset_key)
);

create table if not exists public.arbor_research_visual_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  observation_key text not null,
  asset_id uuid not null references public.arbor_research_visual_assets(id) on delete restrict,
  literal_observation text not null,
  source_region jsonb,
  reviewer_ref text not null,
  observed_at timestamptz not null,
  status text not null default 'literal_visual_observation_only',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,observation_key)
);

create table if not exists public.arbor_research_coverage_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  snapshot_key text not null,
  corpus_version_ref text not null,
  status text not null default 'coverage_not_truth',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,snapshot_key)
);

create table if not exists public.arbor_research_coverage_buckets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  snapshot_id uuid not null references public.arbor_research_coverage_snapshots(id) on delete restrict,
  dimension text not null check (dimension in ('document_family','date_bucket','entity','location','record_type')),
  bucket_key text not null,
  expected_count integer check (expected_count is null or expected_count >= 0),
  observed_count integer not null check (observed_count >= 0),
  processed_count integer not null check (processed_count >= 0),
  coverage_ratio numeric check (coverage_ratio is null or coverage_ratio between 0 and 1),
  missing_observed_count integer not null check (missing_observed_count >= 0),
  status text not null check (status in ('unmeasured','sparse','partial','substantial','complete_observed_set')),
  created_at timestamptz not null default now(),
  check (processed_count <= observed_count),
  unique(owner_id,project_id,snapshot_id,dimension,bucket_key)
);

create table if not exists public.arbor_research_lead_priority_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  priority_key text not null,
  lead_key text not null,
  score numeric not null check (score between 0 and 1),
  normalized_cost numeric not null check (normalized_cost between 0 and 1),
  reasons jsonb not null check (jsonb_typeof(reasons)='array'),
  trigger_evidence_refs jsonb not null check (jsonb_typeof(trigger_evidence_refs)='array'),
  algorithm_version text not null,
  status text not null default 'research_value_only',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,priority_key)
);

create table if not exists public.arbor_research_review_packets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  packet_key text not null,
  title text not null,
  document_key text not null,
  physical_page integer not null check (physical_page > 0),
  original_bytes_sha256 text not null check (original_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  page_hash text not null check (page_hash ~ '^[0-9a-f]{64}$'),
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  packet_payload jsonb not null check (jsonb_typeof(packet_payload)='object'),
  publication_status text not null default 'hold' check (publication_status='hold'),
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,packet_key)
);

create table if not exists public.arbor_research_review_action_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  receipt_key text not null,
  packet_id uuid not null references public.arbor_research_review_packets(id) on delete restrict,
  action text not null check (action in (
    'confirm_extraction','reject_extraction','reject_alias','hold_identity',
    'mark_source_derivative','open_roundabout','accept_ocr_candidate',
    'reject_ocr_candidate','accept_table_candidate','reject_table_candidate',
    'accept_literal_visual_observation','reject_visual_observation'
  )),
  target_ref text not null,
  reviewer_ref text not null,
  rationale text not null,
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs)='array'),
  created_at_action timestamptz not null,
  status text not null default 'recorded_no_source_mutation',
  created_at timestamptz not null default now(),
  unique(owner_id,project_id,receipt_key)
);

alter table public.arbor_research_thread_edges enable row level security;
alter table public.arbor_research_visual_assets enable row level security;
alter table public.arbor_research_visual_observations enable row level security;
alter table public.arbor_research_coverage_snapshots enable row level security;
alter table public.arbor_research_coverage_buckets enable row level security;
alter table public.arbor_research_lead_priority_receipts enable row level security;
alter table public.arbor_research_review_packets enable row level security;
alter table public.arbor_research_review_action_receipts enable row level security;

-- Evidence interpretation and human review receipts are historical records.
drop trigger if exists arbor_research_visual_assets_append_only on public.arbor_research_visual_assets;
create trigger arbor_research_visual_assets_append_only
before update or delete on public.arbor_research_visual_assets
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_visual_observations_append_only on public.arbor_research_visual_observations;
create trigger arbor_research_visual_observations_append_only
before update or delete on public.arbor_research_visual_observations
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_lead_priority_receipts_append_only on public.arbor_research_lead_priority_receipts;
create trigger arbor_research_lead_priority_receipts_append_only
before update or delete on public.arbor_research_lead_priority_receipts
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_review_packets_append_only on public.arbor_research_review_packets;
create trigger arbor_research_review_packets_append_only
before update or delete on public.arbor_research_review_packets
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_review_action_receipts_append_only on public.arbor_research_review_action_receipts;
create trigger arbor_research_review_action_receipts_append_only
before update or delete on public.arbor_research_review_action_receipts
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_thread_edges is
  'Thread edges arise only from explicit message/reply/forward keys; semantic similarity does not create a conversation link.';
comment on table public.arbor_research_visual_observations is
  'Literal reviewed visual observations only. No facial-recognition or identity inference authority.';
comment on table public.arbor_research_coverage_snapshots is
  'Coverage measures search/processing completeness, never truth or evidentiary strength.';
comment on table public.arbor_research_lead_priority_receipts is
  'Research-value ranking only; no person-level suspicion, guilt, or conduct score.';
comment on table public.arbor_research_review_action_receipts is
  'Human review actions append receipts and do not mutate the underlying source evidence.';
