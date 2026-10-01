\set ON_ERROR_STOP on
-- Disposable PostgreSQL acceptance for the Investigation Integrity persistence proposal.
-- Synthetic records only. Never connects to Preview/production and never ingests real investigation material.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_investigation_evidence
(id,user_id,project_id,source_ref,evidence_class,lineage_key,content,content_sha256,supports,underlying_source_ref)
values
(
 '85858585-8585-4585-8585-858585858581',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic:court-record:1',
 'PRIMARY_RECORD',
 'synthetic:court-record:1',
 'Synthetic primary record supporting one bounded act claim.',
 repeat('a',64),
 array['established_act']::text[],
 null
),
(
 '85858585-8585-4585-8585-858585858582',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic:counter-record:1',
 'PRIMARY_RECORD',
 'synthetic:counter-record:1',
 'Synthetic counterevidence requiring explicit treatment.',
 repeat('b',64),
 array['inference']::text[],
 null
);

insert into public.arbor_investigation_claims
(id,user_id,project_id,claim_text,assertion_kind)
values
(
 '87878787-8787-4787-8787-878787878787',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'Synthetic act occurred.',
 'established_act'
);

insert into public.arbor_investigation_claim_evidence
(claim_id,evidence_id,user_id,project_id,role)
values
(
 '87878787-8787-4787-8787-878787878787',
 '85858585-8585-4585-8585-858585858581',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'support'
),
(
 '87878787-8787-4787-8787-878787878787',
 '85858585-8585-4585-8585-858585858582',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'counter'
);

insert into public.arbor_investigation_falsification_attempts
(id,claim_id,user_id,project_id,hypothesis,result,evidence_refs)
values
(
 '90909090-9090-4090-8090-909090909090',
 '87878787-8787-4787-8787-878787878787',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'The synthetic counterevidence defeats the claim.',
 'survived',
 array['85858585-8585-4585-8585-858585858582']::text[]
);

insert into public.arbor_investigation_contradiction_events
(id,claim_id,user_id,project_id,contradiction_key,state,rationale,evidence_refs)
values
(
 '88888888-8888-4888-8888-888888888888',
 '87878787-8787-4787-8787-878787878787',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic-timeline-conflict',
 'open',
 'Synthetic contradiction starts unresolved.',
 array['85858585-8585-4585-8585-858585858581','85858585-8585-4585-8585-858585858582']::text[]
);

-- The trusted loader must return the complete current claim context while the contradiction is open.
do $$
declare r jsonb;
begin
  r := public.arbor_load_investigation_finding_context(
    '87878787-8787-4787-8787-878787878787',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

  if r is null
     or r->>'claimId' <> '87878787-8787-4787-8787-878787878787'
     or r->>'claimText' <> 'Synthetic act occurred.'
     or r->>'assertionKind' <> 'established_act'
     or jsonb_array_length(r->'support') <> 1
     or r#>>'{support,0,evidenceClass}' <> 'PRIMARY_RECORD'
     or r#>>'{support,0,sourceRef}' <> 'synthetic:court-record:1'
     or r#>>'{support,0,lineageKey}' <> 'synthetic:court-record:1'
     or not ((r#>'{support,0,supports}') @> '["established_act"]'::jsonb)
     or jsonb_array_length(r->'counterEvidenceRefs') <> 1
     or r#>>'{counterEvidenceRefs,0}' <> '85858585-8585-4585-8585-858585858582'
     or jsonb_array_length(r->'unresolvedContradictionIds') <> 1
     or r#>>'{unresolvedContradictionIds,0}' <> 'synthetic-timeline-conflict'
     or jsonb_array_length(r->'falsificationAttempts') <> 1
     or r#>>'{falsificationAttempts,0,result}' <> 'survived'
     or not ((r#>'{falsificationAttempts,0,evidenceRefs}')
       @> '["85858585-8585-4585-8585-858585858582"]'::jsonb)
  then
    raise exception 'investigation integrity loader returned malformed context: %',r;
  end if;
end $$;

-- A later immutable resolution event resolves the contradiction without rewriting history.
insert into public.arbor_investigation_contradiction_events
(id,claim_id,user_id,project_id,contradiction_key,state,rationale,evidence_refs)
values
(
 '89898989-8989-4989-8989-898989898989',
 '87878787-8787-4787-8787-878787878787',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic-timeline-conflict',
 'resolved',
 'Synthetic later evidence resolves this contradiction.',
 array['85858585-8585-4585-8585-858585858581']::text[]
);

do $$
declare r jsonb;
begin
  r := public.arbor_load_investigation_finding_context(
    '87878787-8787-4787-8787-878787878787',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );
  if jsonb_array_length(r->'unresolvedContradictionIds') <> 0 then
    raise exception 'resolved contradiction still surfaced as open: %',r;
  end if;
end $$;

-- Wrong owner/project scope cannot read the claim.
do $$
declare r jsonb;
begin
  r := public.arbor_load_investigation_finding_context(
    '87878787-8787-4787-8787-878787878787',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );
  if r is not null then
    raise exception 'cross-owner integrity loader leaked claim context';
  end if;
end $$;

-- Append-only records cannot be rewritten or deleted, even by privileged test setup.
do $$
begin
  begin
    update public.arbor_investigation_evidence
      set content='tampered'
      where id='85858585-8585-4585-8585-858585858581';
    raise exception 'immutable evidence update unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%investigation_records_are_append_only%' then raise; end if;
  end;

  begin
    delete from public.arbor_investigation_claims
      where id='87878787-8787-4787-8787-878787878787';
    raise exception 'immutable claim delete unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%investigation_records_are_append_only%' then raise; end if;
  end;
end $$;

-- Authenticated owner may read only its own rows and cannot invoke the trusted loader or write evidence.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
declare visible integer;
begin
  select count(*) into visible
  from public.arbor_investigation_evidence
  where project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if visible <> 2 then
    raise exception 'owner evidence RLS visibility wrong: %',visible;
  end if;

  select count(*) into visible
  from public.arbor_investigation_evidence
  where user_id='22222222-2222-4222-8222-222222222222';
  if visible <> 0 then
    raise exception 'cross-owner evidence RLS leak: %',visible;
  end if;

  begin
    perform public.arbor_load_investigation_finding_context(
      '87878787-8787-4787-8787-878787878787',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    raise exception 'authenticated client unexpectedly executed integrity loader';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.arbor_investigation_evidence
      (id,user_id,project_id,source_ref,evidence_class,lineage_key,content,
       content_sha256,supports)
    values
      ('85858585-8585-4585-8585-858585858599',
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'synthetic:client-write','PRIMARY_RECORD','synthetic:client-write',
       'Must never insert.',repeat('c',64),array['established_act']::text[]);
    raise exception 'authenticated client unexpectedly inserted integrity evidence';
  exception
    when insufficient_privilege then null;
  end;
end $$;
reset role;

-- PUBLIC/anon/authenticated cannot execute the trusted loader; service_role can.
do $$
declare sig text := 'public.arbor_load_investigation_finding_context(uuid,uuid,uuid)';
begin
  if has_function_privilege('anon',sig,'EXECUTE')
     or has_function_privilege('authenticated',sig,'EXECUTE') then
    raise exception 'client execute leaked for integrity loader';
  end if;
  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.oid=to_regprocedure(sig)
      and a.grantee=0 and a.privilege_type='EXECUTE'
  ) then
    raise exception 'PUBLIC execute leaked for integrity loader';
  end if;
  if not has_function_privilege('service_role',sig,'EXECUTE') then
    raise exception 'service_role execute missing for integrity loader';
  end if;
end $$;

select 'DISPOSABLE_INVESTIGATION_INTEGRITY_PERSISTENCE=PASS; APPEND_ONLY=TRUE; OWNER_SCOPED=TRUE; MODEL_EVIDENCE_AUTHORITY=FALSE' as receipt;
