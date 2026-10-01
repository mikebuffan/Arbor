\set ON_ERROR_STOP on

insert into public.arbor_research_replay_receipts
(owner_id,project_id,recipe_key,recipe_sha256,canonical_recipe_json,code_version)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'recipe-1',repeat('a',64),
 '{"recipeId":"recipe-1","queryText":"synthetic","corpusSnapshotRefs":["snap-1"]}'::jsonb,
 'git:synthetic');

insert into public.arbor_research_evidence_packets_v4
(owner_id,project_id,packet_key,finding_ref,title,replay_recipe_sha256,sources,limitations,
 unresolved_questions,privacy_flag_ids,original_page_review_complete)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'packet-v4-1','finding-1','Synthetic packet',repeat('a',64),
 '[{"evidenceRef":"e1","role":"support"},{"evidenceRef":"e2","role":"counterevidence"}]'::jsonb,
 '["synthetic limitation"]'::jsonb,'["independent source needed"]'::jsonb,'[]'::jsonb,true);

insert into public.arbor_research_multilingual_records
(owner_id,project_id,record_key,document_key,source_language,original_text)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'multi-1','doc-1','es','Hola mundo. Adiós.')
returning id as multilingual_id \gset

insert into public.arbor_research_translation_segments
(owner_id,project_id,multilingual_record_id,segment_key,source_text,translated_text,source_language,target_language,
 source_ref,source_start_utf16,source_end_utf16,translator,translator_version,machine_confidence,ambiguity_notes,human_review_status)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'multilingual_id','seg-1','Hola mundo.','Hello world.','es','en','page:1:0-11',0,11,
 'synthetic-translator','1',0.8,'[]'::jsonb,'unreviewed');

insert into public.arbor_research_scale_receipts
(owner_id,project_id,receipt_key,total_pages,shard_pages,shard_count,current_concurrency,current_batch_pages,
 queue_depth,p95_latency_ms,error_rate,memory_utilization,storage_budget_remaining_ratio,decision,reasons)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'scale-1',3500000,5000,700,8,128,100,25000,0.12,0.93,0.5,'decrease',
 '["high_error_rate","high_memory_utilization","high_latency"]'::jsonb);

insert into public.arbor_research_stopping_receipts
(owner_id,project_id,receipt_key,source_families_exhausted,unresolved_contradiction_count,unresolved_identity_count,
 unresolved_required_work,coverage_ratios,rounds_without_new_evidence,rounds_without_new_leads,minimum_stable_rounds,
 completion_evidence_refs,decision,reasons)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'stop-1',true,0,0,0,'[0.95,0.8,1.0]'::jsonb,3,3,3,'["receipt:a","receipt:b"]'::jsonb,
 'stop_exhausted','["bounded_source_families_exhausted","coverage_threshold_met"]'::jsonb);

do $immut$
begin
  begin
    update public.arbor_research_replay_receipts set code_version='rewritten' where recipe_key='recipe-1';
    raise exception 'replay history rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;

  begin
    update public.arbor_research_multilingual_records set original_text='overwritten translation'
      where record_key='multi-1';
    raise exception 'original multilingual source rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;
end
$immut$;

do $assert$
begin
  if (select status from public.arbor_research_replay_receipts where recipe_key='recipe-1')
      <> 'replayable_recipe_not_finding'
  then raise exception 'replay semantics mismatch'; end if;

  if (select status from public.arbor_research_evidence_packets_v4 where packet_key='packet-v4-1')
      <> 'hold_for_human_evidence_packet_review'
  then raise exception 'evidence packet hold lost'; end if;

  if (select original_text from public.arbor_research_multilingual_records where record_key='multi-1')
      <> 'Hola mundo. Adiós.'
  then raise exception 'multilingual original source changed'; end if;

  if (select count(*) from public.arbor_research_translation_segments
      where multilingual_record_id=(select id from public.arbor_research_multilingual_records where record_key='multi-1')) <> 1
  then raise exception 'translation segment persistence mismatch'; end if;

  if (select shard_count from public.arbor_research_scale_receipts where receipt_key='scale-1') <> 700
  then raise exception 'scale shard math mismatch'; end if;

  if (select decision from public.arbor_research_stopping_receipts where receipt_key='stop-1')
      <> 'stop_exhausted'
  then raise exception 'stopping receipt mismatch'; end if;
end
$assert$;

select 'REPRODUCIBILITY_SCALE_V4_PERSISTENCE=PASS' as result;
