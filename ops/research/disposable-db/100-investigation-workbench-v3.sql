\set ON_ERROR_STOP on

insert into public.arbor_research_thread_edges
(owner_id,project_id,edge_key,from_document_key,to_document_key,edge_type,basis,source_refs)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'thread-edge-1','email-2','email-1','reply_to','in_reply_to_message_id','["p1","p2"]'::jsonb);

insert into public.arbor_research_visual_assets
(owner_id,project_id,asset_key,kind,document_key,physical_page,original_bytes_sha256,image_bytes_sha256,
 source_refs,exhibit_label,caption_text,created_at_source,linked_testimony_refs)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'visual-1','photograph','doc-1',2,repeat('a',64),repeat('b',64),'["page:2"]'::jsonb,
 'Synthetic Exhibit A','Synthetic caption','2020-01-01T00:00:00Z','["testimony:1"]'::jsonb)
returning id as visual_id \gset

insert into public.arbor_research_visual_observations
(owner_id,project_id,observation_key,asset_id,literal_observation,source_region,reviewer_ref,observed_at)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'visual-observation-1',:'visual_id','A vehicle is visible in the lower-left quadrant.',
 '{"x":1,"y":2,"width":3,"height":4}'::jsonb,'synthetic-reviewer','2026-10-01T20:00:00Z');

insert into public.arbor_research_coverage_snapshots
(owner_id,project_id,snapshot_key,corpus_version_ref)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'coverage-1','synthetic-corpus-v1')
returning id as coverage_id \gset

insert into public.arbor_research_coverage_buckets
(owner_id,project_id,snapshot_id,dimension,bucket_key,expected_count,observed_count,processed_count,
 coverage_ratio,missing_observed_count,status)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'coverage_id','document_family','flight_manifests',4,4,3,0.75,1,'substantial'),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'coverage_id','record_type','payments',null,2,0,0,2,'sparse');

insert into public.arbor_research_lead_priority_receipts
(owner_id,project_id,priority_key,lead_key,score,normalized_cost,reasons,trigger_evidence_refs,algorithm_version)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'priority-1','lead-a',0.81,0.17,'["contradiction_density","expected_information_gain"]'::jsonb,
 '["e1","e2"]'::jsonb,'v3-synthetic');

insert into public.arbor_research_review_packets
(owner_id,project_id,packet_key,title,document_key,physical_page,original_bytes_sha256,page_hash,
 source_refs,packet_payload)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'packet-1','Synthetic review packet','doc-1',2,repeat('a',64),repeat('c',64),
 '["page:2"]'::jsonb,'{"identityCandidates":[{"candidateId":"c1","status":"ambiguous"}]}'::jsonb)
returning id as packet_id \gset

insert into public.arbor_research_review_action_receipts
(owner_id,project_id,receipt_key,packet_id,action,target_ref,reviewer_ref,rationale,evidence_refs,created_at_action)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'review-receipt-1',:'packet_id','hold_identity','c1','synthetic-reviewer',
 'Identity remains ambiguous in synthetic source evidence.','["m1"]'::jsonb,'2026-10-01T20:05:00Z');

do $immut$
begin
  begin
    update public.arbor_research_visual_assets set caption_text='rewritten history' where asset_key='visual-1';
    raise exception 'visual evidence history rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;

  begin
    update public.arbor_research_review_packets set publication_status='released' where packet_key='packet-1';
    raise exception 'review packet hold was mutated';
  exception when check_violation then null;
             when object_not_in_prerequisite_state then null;
  end;
end
$immut$;

do $assert$
begin
  if (select status from public.arbor_research_thread_edges where edge_key='thread-edge-1')
      <> 'explicit_message_key_only'
  then raise exception 'thread edge status mismatch'; end if;

  if (select count(*) from public.arbor_research_visual_observations
      where asset_id=(select id from public.arbor_research_visual_assets where asset_key='visual-1')) <> 1
  then raise exception 'visual observation persistence mismatch'; end if;

  if (select status from public.arbor_research_coverage_snapshots where snapshot_key='coverage-1')
      <> 'coverage_not_truth'
  then raise exception 'coverage snapshot semantics mismatch'; end if;

  if (select count(*) from public.arbor_research_coverage_buckets
      where snapshot_id=(select id from public.arbor_research_coverage_snapshots where snapshot_key='coverage-1')) <> 2
  then raise exception 'coverage bucket persistence mismatch'; end if;

  if (select status from public.arbor_research_lead_priority_receipts where priority_key='priority-1')
      <> 'research_value_only'
  then raise exception 'lead priority semantics mismatch'; end if;

  if (select publication_status from public.arbor_research_review_packets where packet_key='packet-1') <> 'hold'
  then raise exception 'review packet publication hold lost'; end if;

  if (select status from public.arbor_research_review_action_receipts where receipt_key='review-receipt-1')
      <> 'recorded_no_source_mutation'
  then raise exception 'review receipt semantics mismatch'; end if;
end
$assert$;

select 'INVESTIGATION_WORKBENCH_V3_PERSISTENCE=PASS' as result;
