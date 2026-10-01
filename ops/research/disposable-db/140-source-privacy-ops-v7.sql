\set ON_ERROR_STOP on

insert into public.arbor_research_capture_authorizations
(owner_id,project_id,authorization_key,source_uri,expected_host,source_authority,source_class,
 max_bytes,max_pages,max_wall_clock_ms,redirect_hosts,human_authorization_ref)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'capture-auth-1','https://records.example.gov/release.pdf','records.example.gov','Synthetic Records Office',
 'official_government',10485760,500,45000,'["records.example.gov"]'::jsonb,'human:synthetic-approval');

insert into public.arbor_research_privacy_candidates
(owner_id,project_id,candidate_key,kind,literal_value,source_refs,related_entity_candidate_ids)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'privacy-1','phone','202-555-0112','["page:1"]'::jsonb,'["entity-candidate-1"]'::jsonb)
returning id as privacy_candidate_id \gset

insert into public.arbor_research_privacy_decisions
(owner_id,project_id,decision_key,candidate_id,decision,reviewer_ref,rationale,basis_evidence_refs,decided_at)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'privacy-decision-1',:'privacy_candidate_id','withhold_private_identifier','synthetic-human',
 'Synthetic privacy review','["page:1"]'::jsonb,'2026-10-01T21:00:00Z');

insert into public.arbor_research_worker_liveness_receipts
(owner_id,project_id,receipt_key,worker_id,observed_at,liveness_status,last_heartbeat_at,lease_expires_at,claimed_unit_id)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'live-1','worker-1','2026-10-01T21:00:00Z','active_lease','2026-10-01T20:59:30Z','2026-10-01T21:02:00Z','unit-1'),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 'live-2','worker-2','2026-10-01T21:00:00Z','unknown',null,null,null);

insert into public.arbor_research_scheduler_state(owner_id,project_id,scheduler_key)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','research'),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','research');

do $fail_closed$
begin
  begin
    update public.arbor_research_scheduler_state
       set enabled=true,cadence='hourly',execution_target='research'
     where owner_id='11111111-1111-4111-8111-111111111111';
    raise exception 'scheduler fail-closed constraint opened';
  exception when check_violation then null;
  end;

  begin
    update public.arbor_research_capture_authorizations set source_uri='https://changed.example.gov/'
     where authorization_key='capture-auth-1';
    raise exception 'capture authorization history rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;

  begin
    update public.arbor_research_privacy_decisions set decision='allow_public_record_identifier'
     where decision_key='privacy-decision-1';
    raise exception 'privacy decision history rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;
end
$fail_closed$;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $owner_one$
begin
  if (select count(*) from public.arbor_research_worker_liveness_receipts) <> 1
  then raise exception 'owner-one worker liveness isolation failed'; end if;
  if (select count(*) from public.arbor_research_scheduler_state) <> 1
  then raise exception 'owner-one scheduler isolation failed'; end if;
  if has_table_privilege('authenticated','public.arbor_research_capture_authorizations','SELECT')
     or has_table_privilege('authenticated','public.arbor_research_privacy_candidates','SELECT')
     or has_table_privilege('authenticated','public.arbor_research_privacy_decisions','SELECT')
  then raise exception 'authenticated raw capture/privacy read privilege leaked'; end if;
end
$owner_one$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $owner_two$
begin
  if (select count(*) from public.arbor_research_worker_liveness_receipts) <> 1
  then raise exception 'owner-two worker liveness isolation failed'; end if;
  if (select count(*) from public.arbor_research_scheduler_state) <> 1
  then raise exception 'owner-two scheduler isolation failed'; end if;
end
$owner_two$;
reset role;

do $assert$
begin
  if (select status from public.arbor_research_capture_authorizations where authorization_key='capture-auth-1')
      <> 'authorized_candidate_not_fetched'
  then raise exception 'capture authorization status mismatch'; end if;
  if (select status from public.arbor_research_privacy_candidates where candidate_key='privacy-1')
      <> 'hold_for_human_privacy_classification'
  then raise exception 'privacy candidate hold lost'; end if;
  if (select status from public.arbor_research_privacy_decisions where decision_key='privacy-decision-1')
      <> 'human_privacy_decision'
  then raise exception 'privacy human-decision receipt mismatch'; end if;
  if exists(select 1 from public.arbor_research_scheduler_state
      where enabled or cadence is not null or execution_target is not null or authorization_ref is not null)
  then raise exception 'scheduler is not structurally disabled'; end if;
end
$assert$;

select 'SOURCE_PRIVACY_OPS_V7=PASS' as result;
