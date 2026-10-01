-- PROPOSED ONLY. DO NOT AUTO-RUN.
-- Epstein public-record research ingestion/verification v1.
-- No production authorization, no service-role grant, no SECURITY DEFINER,
-- no scheduler, no source ingestion and no publication is created here.
-- Apply only after the existing item-42 security review and live integration approval.

create extension if not exists pgcrypto;

create table if not exists public.arbor_research_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  document_key text not null,
  typology text not null check (typology in (
    'legal_deposition','interview_transcript','flight_manifest','calendar',
    'address_book','financial_record','email_or_message','legal_filing',
    'handwritten_note','photograph_or_exhibit','other_or_unknown'
  )),
  source_uri text not null,
  original_bytes_sha256 text not null check (original_bytes_sha256 ~ '^[0-9a-f]{64}$'),
  byte_length bigint not null check (byte_length > 0),
  declared_page_count integer not null check (declared_page_count > 0),
  release_id text,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, document_key, original_bytes_sha256)
);

create table if not exists public.arbor_research_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  document_id uuid not null references public.arbor_research_documents(id) on delete restrict,
  physical_page integer not null check (physical_page > 0),
  printed_page text,
  exact_sha256 text not null check (exact_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_text_sha256 text check (normalized_text_sha256 is null or normalized_text_sha256 ~ '^[0-9a-f]{64}$'),
  bates_number bigint,
  extraction_status text not null check (extraction_status in ('text_layer','image_only','ocr','extraction_failed')),
  extraction_text text,
  review_status text not null default 'hold_for_original_page_image_and_privacy_review',
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, document_id, physical_page),
  unique(owner_id, project_id, document_id, exact_sha256, physical_page)
);

create index if not exists arbor_research_pages_exact_sha_idx
  on public.arbor_research_pages(owner_id, project_id, exact_sha256);
create index if not exists arbor_research_pages_text_sha_idx
  on public.arbor_research_pages(owner_id, project_id, normalized_text_sha256)
  where normalized_text_sha256 is not null;
create index if not exists arbor_research_pages_bates_idx
  on public.arbor_research_pages(owner_id, project_id, bates_number)
  where bates_number is not null;

create table if not exists public.arbor_research_redaction_boxes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  page_id uuid not null references public.arbor_research_pages(id) on delete restrict,
  x numeric not null check (x >= 0),
  y numeric not null check (y >= 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  page_width numeric not null check (page_width > 0),
  page_height numeric not null check (page_height > 0),
  created_at timestamptz not null default now(),
  check (x + width <= page_width),
  check (y + height <= page_height)
);

create table if not exists public.arbor_research_mentions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  mention_key text not null,
  page_id uuid not null references public.arbor_research_pages(id) on delete restrict,
  line_start integer check (line_start is null or line_start > 0),
  line_end integer check (line_end is null or line_end > 0),
  start_utf16 integer not null check (start_utf16 >= 0),
  end_utf16 integer not null check (end_utf16 > start_utf16),
  raw_text text not null,
  normalized_text text not null,
  extraction_method text not null check (extraction_method in ('regex','text_layer','ocr','human')),
  extraction_confidence numeric check (extraction_confidence is null or extraction_confidence between 0 and 1),
  entity_candidate_id uuid,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, mention_key)
);

create table if not exists public.arbor_research_entity_candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  candidate_key text not null,
  kind text not null check (kind in ('person','organization','location','aircraft','account','other')),
  canonical_label text not null,
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases)='array'),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, candidate_key)
);

alter table public.arbor_research_mentions
  drop constraint if exists arbor_research_mentions_entity_candidate_id_fkey;
alter table public.arbor_research_mentions
  add constraint arbor_research_mentions_entity_candidate_id_fkey
  foreign key (entity_candidate_id) references public.arbor_research_entity_candidates(id) on delete restrict;

create table if not exists public.arbor_research_identity_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  decision_key text not null,
  candidate_id uuid not null references public.arbor_research_entity_candidates(id) on delete restrict,
  target_entity_key text,
  status text not null check (status in ('resolved','candidate','ambiguous','rejected')),
  basis_mention_ids uuid[] not null,
  rationale text not null,
  supersedes_decision_id uuid references public.arbor_research_identity_decisions(id) on delete restrict,
  decided_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((status='resolved' and target_entity_key is not null) or (status<>'resolved' and target_entity_key is null)),
  unique(owner_id, project_id, decision_key)
);

create table if not exists public.arbor_research_source_origins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  source_key text not null,
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  derives_from_source_key text,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, source_key)
);

create table if not exists public.arbor_research_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  edge_key text not null,
  left_entity_key text not null,
  right_entity_key text not null,
  edge_type text not null check (edge_type in (
    'person_person','person_location','person_organization','person_flight',
    'person_account_or_payment','person_communication','document_document',
    'source_source','proximity'
  )),
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs)='array'),
  source_family_ids jsonb not null check (jsonb_typeof(source_family_ids)='array'),
  first_observed_at timestamptz,
  last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  check (left_entity_key <> right_entity_key),
  check (last_observed_at is null or first_observed_at is null or last_observed_at >= first_observed_at),
  unique(owner_id, project_id, edge_key)
);

create table if not exists public.arbor_research_timeline_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  observation_key text not null,
  entity_keys jsonb not null check (jsonb_typeof(entity_keys)='array'),
  place_key text,
  relation text not null check (relation in ('exact','approximate','before','after','range')),
  start_at timestamptz,
  end_at timestamptz,
  reported_at timestamptz,
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs)='array'),
  created_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at >= start_at),
  unique(owner_id, project_id, observation_key)
);

create table if not exists public.arbor_research_anomalies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  anomaly_key text not null,
  anomaly_type text not null,
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs)='array'),
  description text not null,
  status text not null default 'open' check (status in ('open','investigating','resolved','rejected')),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, anomaly_key)
);

create table if not exists public.arbor_research_interrupts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  interrupt_key text not null,
  anomaly_id uuid not null references public.arbor_research_anomalies(id) on delete restrict,
  parent_checkpoint_ref text not null,
  query_text text not null,
  expected_evidence_type text not null,
  max_depth integer not null check (max_depth between 1 and 5),
  max_hops_per_attempt integer not null check (max_hops_per_attempt between 1 and 10),
  stopping_condition text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','blocked','cancelled')),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, interrupt_key)
);

create table if not exists public.arbor_research_findings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  finding_key text not null,
  version integer not null check (version > 0),
  statement text not null,
  evidence_status text not null check (evidence_status in ('direct','corroborated','single_source','inferred')),
  identity_status text not null check (identity_status in ('resolved','candidate','ambiguous','rejected')),
  connection_types jsonb not null check (jsonb_typeof(connection_types)='array'),
  unresolved_weaknesses jsonb not null check (jsonb_typeof(unresolved_weaknesses)='array'),
  review_status text not null default 'hold_for_human_review',
  supersedes_version integer,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, finding_key, version),
  check ((version=1 and supersedes_version is null) or (version>1 and supersedes_version=version-1))
);

create table if not exists public.arbor_research_finding_dependencies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  finding_id uuid not null references public.arbor_research_findings(id) on delete restrict,
  evidence_ref text not null,
  dependency_role text not null check (dependency_role in ('support','counterevidence','context')),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, finding_id, evidence_ref, dependency_role)
);

create table if not exists public.arbor_research_evidence_changes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  evidence_ref text not null,
  change_type text not null check (change_type in ('corrected','superseded','reclassified_duplicate','retracted','identity_changed')),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.arbor_research_expected_record_leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  lead_key text not null,
  expectation_reason text not null,
  expected_record_kind text not null,
  supporting_evidence_refs jsonb not null check (jsonb_typeof(supporting_evidence_refs)='array'),
  observed_status text not null default 'not_observed_in_current_corpus'
    check (observed_status='not_observed_in_current_corpus'),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, lead_key)
);

-- RLS is intentionally enabled without broad policies or service-role grants.
-- Existing ARK owner/project policy design and item-42 privilege review must be
-- reconciled before any live application.
alter table public.arbor_research_documents enable row level security;
alter table public.arbor_research_pages enable row level security;
alter table public.arbor_research_redaction_boxes enable row level security;
alter table public.arbor_research_mentions enable row level security;
alter table public.arbor_research_entity_candidates enable row level security;
alter table public.arbor_research_identity_decisions enable row level security;
alter table public.arbor_research_source_origins enable row level security;
alter table public.arbor_research_edges enable row level security;
alter table public.arbor_research_timeline_observations enable row level security;
alter table public.arbor_research_anomalies enable row level security;
alter table public.arbor_research_interrupts enable row level security;
alter table public.arbor_research_findings enable row level security;
alter table public.arbor_research_finding_dependencies enable row level security;
alter table public.arbor_research_evidence_changes enable row level security;
alter table public.arbor_research_expected_record_leads enable row level security;

comment on table public.arbor_research_mentions is
  'Immutable occurrence ledger. Identity corrections do not rewrite source mentions.';
comment on table public.arbor_research_identity_decisions is
  'Append-only identity resolution decisions; supersession preserves correction history.';
comment on table public.arbor_research_expected_record_leads is
  'Absence/missingness research leads only; rows are not evidence of conduct.';
comment on table public.arbor_research_findings is
  'Versioned review candidates only; no automatic publication authority.';


-- Append-only evidence/history guard. This is ordinary invoker-security PL/pgSQL,
-- not SECURITY DEFINER. Production privilege review is still required.
create or replace function public.arbor_research_reject_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'append_only_research_history:%', tg_table_name
    using errcode = '55000';
end
$$;

revoke all on function public.arbor_research_reject_history_mutation() from public;

drop trigger if exists arbor_research_mentions_append_only on public.arbor_research_mentions;
create trigger arbor_research_mentions_append_only
before update or delete on public.arbor_research_mentions
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_identity_decisions_append_only on public.arbor_research_identity_decisions;
create trigger arbor_research_identity_decisions_append_only
before update or delete on public.arbor_research_identity_decisions
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_findings_append_only on public.arbor_research_findings;
create trigger arbor_research_findings_append_only
before update or delete on public.arbor_research_findings
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_finding_dependencies_append_only on public.arbor_research_finding_dependencies;
create trigger arbor_research_finding_dependencies_append_only
before update or delete on public.arbor_research_finding_dependencies
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_evidence_changes_append_only on public.arbor_research_evidence_changes;
create trigger arbor_research_evidence_changes_append_only
before update or delete on public.arbor_research_evidence_changes
for each row execute function public.arbor_research_reject_history_mutation();


create table if not exists public.arbor_research_releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  release_key text not null,
  source_authority text not null,
  published_at timestamptz,
  parent_release_key text,
  source_ref text not null,
  created_at timestamptz not null default now(),
  check (parent_release_key is null or parent_release_key <> release_key),
  unique(owner_id, project_id, release_key)
);

create table if not exists public.arbor_research_release_deltas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  prior_release_key text not null,
  current_release_key text not null,
  added_page_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(added_page_ids)='array'),
  removed_page_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(removed_page_ids)='array'),
  changed_page_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(changed_page_ids)='array'),
  reordered_page_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(reordered_page_ids)='array'),
  new_attachment_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(new_attachment_refs)='array'),
  missing_bates_numbers jsonb not null default '[]'::jsonb check (jsonb_typeof(missing_bates_numbers)='array'),
  evidence_ref text not null,
  created_at timestamptz not null default now(),
  check (prior_release_key <> current_release_key),
  unique(owner_id, project_id, prior_release_key, current_release_key)
);

create table if not exists public.arbor_research_replay_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  replay_key text not null,
  finding_key text not null,
  finding_version integer not null check (finding_version > 0),
  changed_evidence_refs jsonb not null check (jsonb_typeof(changed_evidence_refs)='array'),
  reason text not null,
  status text not null default 'queued' check (status in ('queued','reviewing','resolved','blocked')),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, replay_key)
);

create table if not exists public.arbor_research_adversarial_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid not null,
  review_key text not null,
  finding_key text not null,
  finding_version integer not null check (finding_version > 0),
  independent_source_family_count integer not null check (independent_source_family_count >= 0),
  counterevidence_refs jsonb not null check (jsonb_typeof(counterevidence_refs)='array'),
  alternative_explanations jsonb not null check (jsonb_typeof(alternative_explanations)='array'),
  chronology_conflict_ids jsonb not null check (jsonb_typeof(chronology_conflict_ids)='array'),
  unresolved_identity_ids jsonb not null check (jsonb_typeof(unresolved_identity_ids)='array'),
  result_status text not null check (result_status in ('hold','eligible_for_human_promotion_review')),
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, review_key)
);

alter table public.arbor_research_releases enable row level security;
alter table public.arbor_research_release_deltas enable row level security;
alter table public.arbor_research_replay_queue enable row level security;
alter table public.arbor_research_adversarial_reviews enable row level security;

drop trigger if exists arbor_research_release_deltas_append_only on public.arbor_research_release_deltas;
create trigger arbor_research_release_deltas_append_only
before update or delete on public.arbor_research_release_deltas
for each row execute function public.arbor_research_reject_history_mutation();

drop trigger if exists arbor_research_adversarial_reviews_append_only on public.arbor_research_adversarial_reviews;
create trigger arbor_research_adversarial_reviews_append_only
before update or delete on public.arbor_research_adversarial_reviews
for each row execute function public.arbor_research_reject_history_mutation();

comment on table public.arbor_research_release_deltas is
  'Append-only comparison receipts between public-record release snapshots; deltas are not findings.';
comment on table public.arbor_research_replay_queue is
  'Re-review queue derived from evidence changes and finding dependencies.';
comment on table public.arbor_research_adversarial_reviews is
  'Recorded pre-promotion challenge review; eligible status still requires human promotion review.';
