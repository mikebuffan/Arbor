\set ON_ERROR_STOP on

\echo 'Apply synthetic ingestion/verification acceptance'

insert into public.arbor_research_documents
(owner_id, project_id, document_key, typology, source_uri, original_bytes_sha256, byte_length, declared_page_count, release_id)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'synthetic-doc','legal_deposition','https://example.org/synthetic.pdf',repeat('a',64),1024,2,'synthetic-release')
returning id as synthetic_document_id \gset

insert into public.arbor_research_pages
(owner_id, project_id, document_id, physical_page, exact_sha256, normalized_text_sha256, extraction_status, extraction_text)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'synthetic_document_id',1,repeat('b',64),repeat('c',64),'text_layer','Synthetic Person appears here.');

insert into public.arbor_research_pages
(owner_id, project_id, document_id, physical_page, exact_sha256, normalized_text_sha256, bates_number, extraction_status, extraction_text)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'synthetic_document_id',2,repeat('d',64),repeat('e',64),102,'text_layer','Second synthetic page.')
returning id as synthetic_page_id \gset

insert into public.arbor_research_entity_candidates
(owner_id, project_id, candidate_key, kind, canonical_label, aliases)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'candidate-1','person','Synthetic Person','["S. Person"]'::jsonb)
returning id as synthetic_candidate_id \gset

insert into public.arbor_research_mentions
(owner_id, project_id, mention_key, page_id, line_start, line_end, start_utf16, end_utf16, raw_text, normalized_text, extraction_method, extraction_confidence, entity_candidate_id)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'mention-1',:'synthetic_page_id',1,1,0,16,'Synthetic Person','synthetic person','text_layer',1,:'synthetic_candidate_id');

do $$
begin
  begin
    insert into public.arbor_research_mentions
    (owner_id, project_id, mention_key, page_id, start_utf16, end_utf16, raw_text, normalized_text, extraction_method)
    values
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
     'mention-1',(select id from public.arbor_research_pages where physical_page=2 limit 1),0,1,'X','x','regex');
    raise exception 'duplicate mention key was accepted';
  exception when unique_violation then null;
  end;
end $$;

do $$
begin
  begin
    insert into public.arbor_research_identity_decisions
    (owner_id, project_id, decision_key, candidate_id, target_entity_key, status, basis_mention_ids, rationale, decided_at)
    values
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
     'bad-resolved',(select id from public.arbor_research_entity_candidates where candidate_key='candidate-1'),null,'resolved',array[(select id from public.arbor_research_mentions limit 1)],
     'must fail',now());
    raise exception 'resolved identity without target was accepted';
  exception when check_violation then null;
  end;
end $$;

insert into public.arbor_research_identity_decisions
(owner_id, project_id, decision_key, candidate_id, target_entity_key, status, basis_mention_ids, rationale, decided_at)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'decision-1',:'synthetic_candidate_id',null,'ambiguous',array[(select id from public.arbor_research_mentions limit 1)],
 'synthetic ambiguity preserved',now());

do $immut$
begin
  begin
    update public.arbor_research_mentions set normalized_text='rewritten history' where mention_key='mention-1';
    raise exception 'append-only mention ledger allowed rewrite';
  exception when object_not_in_prerequisite_state then null;
  end;
end
$immut$;

insert into public.arbor_research_expected_record_leads
(owner_id, project_id, lead_key, expectation_reason, expected_record_kind, supporting_evidence_refs)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'lead-1','Synthetic email references an attachment','attachment','["mention-1"]'::jsonb);

do $$
begin
  begin
    update public.arbor_research_expected_record_leads
      set observed_status='confirmed_missing'
      where lead_key='lead-1';
    raise exception 'absence lead was promoted to unsupported evidence state';
  exception when check_violation then null;
  end;
end $$;

insert into public.arbor_research_findings
(owner_id, project_id, finding_key, version, statement, evidence_status, identity_status, connection_types, unresolved_weaknesses)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'finding-1',1,'Synthetic review candidate','single_source','ambiguous','["documented"]'::jsonb,'[]'::jsonb)
returning id as synthetic_finding_id \gset

insert into public.arbor_research_finding_dependencies
(owner_id, project_id, finding_id, evidence_ref, dependency_role)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'synthetic_finding_id','mention-1','support');

do $$
begin
  begin
    insert into public.arbor_research_findings
    (owner_id, project_id, finding_key, version, statement, evidence_status, identity_status, connection_types, unresolved_weaknesses, supersedes_version)
    values
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
     'finding-1',3,'Skipped version','inferred','ambiguous','[]'::jsonb,'[]'::jsonb,1);
    raise exception 'non-sequential finding version was accepted';
  exception when check_violation then null;
  end;
end $$;

insert into public.arbor_research_evidence_changes
(owner_id, project_id, evidence_ref, change_type, reason)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'mention-1','reclassified_duplicate','synthetic shared-origin test');

insert into public.arbor_research_releases
(owner_id, project_id, release_key, source_authority, published_at, parent_release_key, source_ref)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'release-a','synthetic authority','2026-01-01T00:00:00Z',null,'synthetic:release-a'),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'release-b','synthetic authority','2026-02-01T00:00:00Z','release-a','synthetic:release-b');

insert into public.arbor_research_release_deltas
(owner_id, project_id, prior_release_key, current_release_key, added_page_ids, removed_page_ids, changed_page_ids, evidence_ref)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'release-a','release-b','["p3"]'::jsonb,'["p2"]'::jsonb,'["p1"]'::jsonb,'synthetic:delta');

insert into public.arbor_research_replay_queue
(owner_id, project_id, replay_key, finding_key, finding_version, changed_evidence_refs, reason)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'replay-1','finding-1',1,'["mention-1"]'::jsonb,'synthetic evidence reclassified');

insert into public.arbor_research_adversarial_reviews
(owner_id, project_id, review_key, finding_key, finding_version, independent_source_family_count,
 counterevidence_refs, alternative_explanations, chronology_conflict_ids, unresolved_identity_ids, result_status)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'review-1','finding-1',1,1,'["search:counter"]'::jsonb,'["shared source"]'::jsonb,'[]'::jsonb,'["candidate-1"]'::jsonb,'hold');

select
  (select count(*) from public.arbor_research_mentions where mention_key='mention-1') = 1
  and
  (select observed_status from public.arbor_research_expected_record_leads where lead_key='lead-1') = 'not_observed_in_current_corpus'
  and
  (select review_status from public.arbor_research_findings where finding_key='finding-1' and version=1) = 'hold_for_human_review'
  and
  (select count(*) from public.arbor_research_release_deltas where prior_release_key='release-a' and current_release_key='release-b') = 1
  and
  (select status from public.arbor_research_replay_queue where replay_key='replay-1') = 'queued'
  and
  (select result_status from public.arbor_research_adversarial_reviews where review_key='review-1') = 'hold'
as ingestion_verification_acceptance_pass;
