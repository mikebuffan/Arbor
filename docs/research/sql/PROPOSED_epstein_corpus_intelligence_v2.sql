-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Requires PROPOSED_epstein_ingestion_verification_v1.sql first.
-- No scheduler, worker enablement, source ingestion, embedding API, or publication.

create table if not exists public.arbor_research_ocr_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  receipt_key text not null,
  document_key text not null,
  physical_page integer not null check (physical_page > 0),
  original_bytes_sha256 text not null check (original_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  image_bytes_sha256 text not null check (image_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  engine text not null,
  engine_version text not null,
  source_kind text not null check (source_kind in ('printed','handwritten','mixed','unknown')),
  page_pixel_width integer not null check (page_pixel_width > 0),
  page_pixel_height integer not null check (page_pixel_height > 0),
  extracted_text text not null,
  mean_confidence numeric check (mean_confidence is null or mean_confidence between 0 and 1),
  review_status text not null default 'hold_for_human_ocr_and_original_image_review',
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, receipt_key)
);

create table if not exists public.arbor_research_ocr_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  ocr_receipt_id uuid not null references public.arbor_research_ocr_receipts(id) on delete restrict,
  token_key text not null,
  token_text text not null,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  x numeric not null check (x >= 0),
  y numeric not null check (y >= 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, ocr_receipt_id, token_key)
);

create table if not exists public.arbor_research_ocr_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  review_key text not null,
  ocr_receipt_id uuid not null references public.arbor_research_ocr_receipts(id) on delete restrict,
  reviewer_ref text not null,
  reviewed_at timestamptz not null,
  decision text not null check (decision in ('accepted_as_transcription_candidate','rejected','corrected')),
  corrected_text text,
  correction_notes text,
  status text not null default 'hold_for_independent_source_and_privacy_review',
  created_at timestamptz not null default now(),
  check ((decision='corrected' and corrected_text is not null) or (decision<>'corrected' and corrected_text is null)),
  unique(owner_id, project_id, review_key)
);

create table if not exists public.arbor_research_table_reconstructions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  table_key text not null,
  page_hash text not null check (page_hash ~ '^[0-9a-f]{64}$'),
  row_count integer not null check (row_count > 0),
  column_count integer not null check (column_count > 0),
  row_tolerance_px numeric not null check (row_tolerance_px > 0),
  column_tolerance_px numeric not null check (column_tolerance_px > 0),
  status text not null default 'candidate_requires_visual_review',
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, table_key)
);

create table if not exists public.arbor_research_table_cells (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  table_id uuid not null references public.arbor_research_table_reconstructions(id) on delete restrict,
  row_index integer not null check (row_index >= 0),
  column_index integer not null check (column_index >= 0),
  cell_text text not null,
  token_ids jsonb not null check (jsonb_typeof(token_ids)='array'),
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  x numeric not null check (x >= 0),
  y numeric not null check (y >= 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, table_id, row_index, column_index)
);

create table if not exists public.arbor_research_retrieval_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  record_key text not null,
  searchable_text text not null,
  identifiers jsonb not null default '[]'::jsonb check (jsonb_typeof(identifiers)='array'),
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  text_sha256 text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  embedding_model_ref text,
  embedding_vector jsonb check (embedding_vector is null or jsonb_typeof(embedding_vector)='array'),
  search_vector tsvector generated always as (to_tsvector('simple', searchable_text)) stored,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, record_key)
);
create index if not exists arbor_research_retrieval_fts_idx
  on public.arbor_research_retrieval_records using gin(search_vector);

create table if not exists public.arbor_research_document_family_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  edge_key text not null,
  left_document_key text not null,
  right_document_key text not null,
  edge_type text not null check (edge_type in (
    'reply_to','attachment_of','same_calendar_event','same_trip',
    'invoice_payment','deposition_exhibit'
  )),
  basis text not null,
  source_refs jsonb not null check (jsonb_typeof(source_refs)='array'),
  status text not null default 'explicit_or_deterministic_link',
  created_at timestamptz not null default now(),
  check (left_document_key <> right_document_key),
  unique(owner_id, project_id, edge_key)
);

alter table public.arbor_research_ocr_receipts enable row level security;
alter table public.arbor_research_ocr_tokens enable row level security;
alter table public.arbor_research_ocr_reviews enable row level security;
alter table public.arbor_research_table_reconstructions enable row level security;
alter table public.arbor_research_table_cells enable row level security;
alter table public.arbor_research_retrieval_records enable row level security;
alter table public.arbor_research_document_family_edges enable row level security;

-- Preserve machine output and review history. Corrections append a review record;
-- they never rewrite the original OCR receipt or extracted token coordinates.
drop trigger if exists arbor_research_ocr_receipts_append_only on public.arbor_research_ocr_receipts;
create trigger arbor_research_ocr_receipts_append_only
before update or delete on public.arbor_research_ocr_receipts
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_ocr_tokens_append_only on public.arbor_research_ocr_tokens;
create trigger arbor_research_ocr_tokens_append_only
before update or delete on public.arbor_research_ocr_tokens
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_ocr_reviews_append_only on public.arbor_research_ocr_reviews;
create trigger arbor_research_ocr_reviews_append_only
before update or delete on public.arbor_research_ocr_reviews
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_table_reconstructions_append_only on public.arbor_research_table_reconstructions;
create trigger arbor_research_table_reconstructions_append_only
before update or delete on public.arbor_research_table_reconstructions
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_table_cells_append_only on public.arbor_research_table_cells;
create trigger arbor_research_table_cells_append_only
before update or delete on public.arbor_research_table_cells
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_document_family_edges_append_only on public.arbor_research_document_family_edges;
create trigger arbor_research_document_family_edges_append_only
before update or delete on public.arbor_research_document_family_edges
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_ocr_receipts is
  'Machine OCR is append-only secondary evidence extraction and never replaces original bytes, page images, or text-layer extraction.';
comment on table public.arbor_research_retrieval_records is
  'Retrieval index only. Ranking results are leads to source-anchored records, never promoted findings.';
comment on table public.arbor_research_document_family_edges is
  'Explicit/deterministic document relationships only; proximity does not create family edges.';
