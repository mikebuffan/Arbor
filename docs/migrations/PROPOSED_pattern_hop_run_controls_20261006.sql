-- Review/disposable testing only. Not an applied migration.
-- Deploy with the controlled worker; keep historical task submission OFF until
-- tested. Existing direct table writers are not fenced by these functions.
begin;
create table public.arbor_pattern_hop_controls (
 run_id uuid primary key references public.arbor_pattern_hop_runs(id) on delete cascade,
 lease_token uuid, lease_expires_at timestamptz, stop_requested boolean not null default false,
 check ((lease_token is null) = (lease_expires_at is null))
);
alter table public.arbor_pattern_hop_controls enable row level security;
revoke all on public.arbor_pattern_hop_controls from public, anon, authenticated;
grant select,insert,update,delete on public.arbor_pattern_hop_controls to service_role;

create function public.arbor_claim_pattern_hop_run(p_user_id uuid,p_project_id uuid,p_run_id uuid,p_lease_token uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare c public.arbor_pattern_hop_controls;
begin
 if p_lease_token is null then raise exception 'lease_token_required'; end if;
 perform 1 from public.arbor_pattern_hop_runs where id=p_run_id and user_id=p_user_id and project_id=p_project_id;
 if not found then raise exception 'pattern_hop_run_not_found'; end if;
 insert into public.arbor_pattern_hop_controls(run_id) values(p_run_id) on conflict do nothing;
 select * into c from public.arbor_pattern_hop_controls where run_id=p_run_id for update;
 if c.stop_requested then return 'stopped'; end if;
 if c.lease_token is not null and c.lease_expires_at>clock_timestamp() then return 'busy'; end if;
 update public.arbor_pattern_hop_controls set lease_token=p_lease_token,lease_expires_at=clock_timestamp()+interval '90 seconds' where run_id=p_run_id;
 return 'claimed';
end $$;

create function public.arbor_renew_pattern_hop_run(p_user_id uuid,p_project_id uuid,p_run_id uuid,p_lease_token uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare c public.arbor_pattern_hop_controls;
begin
 perform 1 from public.arbor_pattern_hop_runs where id=p_run_id and user_id=p_user_id and project_id=p_project_id;
 if not found then raise exception 'pattern_hop_run_not_found'; end if;
 select * into c from public.arbor_pattern_hop_controls where run_id=p_run_id for update;
 if not found then return 'lease_lost'; end if;
 if c.stop_requested then return 'stopped'; end if;
 if c.lease_token is distinct from p_lease_token or c.lease_token is null or c.lease_expires_at<=clock_timestamp() then return 'lease_lost'; end if;
 update public.arbor_pattern_hop_controls set lease_expires_at=clock_timestamp()+interval '90 seconds' where run_id=p_run_id;
 return 'renewed';
end $$;

create function public.arbor_release_pattern_hop_run(p_user_id uuid,p_project_id uuid,p_run_id uuid,p_lease_token uuid)
returns text language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.arbor_pattern_hop_runs where id=p_run_id and user_id=p_user_id and project_id=p_project_id;
 if not found then raise exception 'pattern_hop_run_not_found'; end if;
 update public.arbor_pattern_hop_controls set lease_token=null,lease_expires_at=null where run_id=p_run_id and lease_token=p_lease_token;
 if not found then return 'lease_lost'; end if;
 return 'released';
end $$;

create function public.arbor_stop_pattern_hop_run(p_user_id uuid,p_project_id uuid,p_run_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.arbor_pattern_hop_runs where id=p_run_id and user_id=p_user_id and project_id=p_project_id;
 if not found then raise exception 'pattern_hop_run_not_found'; end if;
 insert into public.arbor_pattern_hop_controls(run_id,stop_requested) values(p_run_id,true)
 on conflict(run_id) do update set stop_requested=true;
 return 'stop_requested';
end $$;

create function public.arbor_commit_pattern_hop_checkpoint(
 p_user_id uuid,p_project_id uuid,p_run_id uuid,p_lease_token uuid,
 p_state jsonb,p_verification jsonb,p_evidence jsonb,p_edges jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare c public.arbor_pattern_hop_controls; e jsonb; v_id uuid; v_from uuid; v_to uuid; ids jsonb='{}';
begin
 perform 1 from public.arbor_pattern_hop_runs where id=p_run_id and user_id=p_user_id and project_id=p_project_id;
 if not found then raise exception 'pattern_hop_run_not_found'; end if;
 select * into c from public.arbor_pattern_hop_controls where run_id=p_run_id for update;
 if not found then return 'lease_lost'; end if;
 if c.stop_requested then return 'stopped'; end if;
 if c.lease_token is null or c.lease_token is distinct from p_lease_token or c.lease_expires_at<=clock_timestamp() then return 'lease_lost'; end if;
 if jsonb_typeof(p_evidence) is distinct from 'array' or jsonb_typeof(p_edges) is distinct from 'array' or
    jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_verification) is distinct from 'object' then raise exception 'invalid_checkpoint_payload'; end if;
 if jsonb_array_length(p_evidence)>32 or jsonb_array_length(p_edges)>64 then raise exception 'checkpoint_batch_limit'; end if;
 if p_state->>'status' is null or p_state->>'status' not in ('active','blocked','complete','exhausted') then raise exception 'invalid_checkpoint_status'; end if;
 if jsonb_typeof(p_state->'frontier') is distinct from 'array' or jsonb_typeof(p_state->'visited') is distinct from 'array' or
    jsonb_typeof(p_state->'completedBranches') is distinct from 'array' or jsonb_typeof(p_state->'exhaustedBranches') is distinct from 'array' then raise exception 'invalid_checkpoint_state'; end if;
 for e in select value from jsonb_array_elements(p_evidence) loop
  if coalesce(e->>'id','')='' or coalesce(e->>'source','')='' or coalesce(e->>'content','')='' then raise exception 'invalid_checkpoint_evidence'; end if;
  insert into public.arbor_pattern_hop_evidence(run_id,user_id,project_id,source,source_thread_id,source_message_id,source_artifact_id,speaker,evidence_type,content,occurred_at,chronology_rank,confidence,epistemic_status,metadata)
  values(p_run_id,p_user_id,p_project_id,e->>'source',e->>'sourceThreadId',e->>'sourceMessageId',e->>'sourceArtifactId',e->>'speaker',e->>'evidenceType',e->>'content',(e->>'occurredAt')::timestamptz,(e->>'chronologyRank')::integer,(e->>'confidence')::numeric,e->>'epistemicStatus',jsonb_build_object('client_evidence_id',e->>'id'))
  on conflict do nothing;
  select id into v_id from public.arbor_pattern_hop_evidence where run_id=p_run_id and user_id=p_user_id and project_id=p_project_id and source=e->>'source' and source_message_id is not distinct from (e->>'sourceMessageId') and content=e->>'content';
  if v_id is null then raise exception 'checkpoint_evidence_unresolved'; end if;
  ids=ids||jsonb_build_object(e->>'id',v_id::text);
 end loop;
 for e in select value from jsonb_array_elements(p_edges) loop
  v_from=null;
  if e->>'fromEvidenceId' is not null then
   select id into v_from from public.arbor_pattern_hop_evidence where run_id=p_run_id and user_id=p_user_id and project_id=p_project_id and (id::text=ids->>(e->>'fromEvidenceId') or metadata->>'client_evidence_id'=e->>'fromEvidenceId' or id::text=e->>'fromEvidenceId');
   if v_from is null then raise exception 'checkpoint_parent_unresolved'; end if;
  end if;
  select id into v_to from public.arbor_pattern_hop_evidence where run_id=p_run_id and user_id=p_user_id and project_id=p_project_id and (id::text=ids->>(e->>'toEvidenceId') or metadata->>'client_evidence_id'=e->>'toEvidenceId' or id::text=e->>'toEvidenceId');
  if v_to is null then raise exception 'checkpoint_child_unresolved'; end if;
  if not exists(select 1 from public.arbor_pattern_hop_edges where run_id=p_run_id and from_evidence_id is not distinct from v_from and to_evidence_id=v_to and relationship=e->>'relationship' and hop_depth=(e->>'hopDepth')::integer) then
   insert into public.arbor_pattern_hop_edges(run_id,from_evidence_id,to_evidence_id,originating_clue,relationship,hop_depth,confidence,epistemic_status,rationale)
   values(p_run_id,v_from,v_to,e->>'originatingClue',e->>'relationship',(e->>'hopDepth')::integer,(e->>'confidence')::numeric,e->>'epistemicStatus',e->>'rationale');
  end if;
 end loop;
 update public.arbor_pattern_hop_runs set status=p_state->>'status',frontier=p_state->'frontier',visited=p_state->'visited',completed_branches=p_state->'completedBranches',exhausted_branches=p_state->'exhaustedBranches',blocker=p_state->>'blocker',verification_state=p_verification,updated_at=clock_timestamp()
 where id=p_run_id and user_id=p_user_id and project_id=p_project_id and max_depth=(p_state->>'maxDepth')::integer;
 if not found then raise exception 'checkpoint_depth_mismatch'; end if;
 update public.arbor_pattern_hop_controls set lease_expires_at=clock_timestamp()+interval '90 seconds' where run_id=p_run_id;
 return 'committed';
end $$;

revoke execute on function public.arbor_claim_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_renew_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_release_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_stop_pattern_hop_run(uuid,uuid,uuid),public.arbor_commit_pattern_hop_checkpoint(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.arbor_claim_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_renew_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_release_pattern_hop_run(uuid,uuid,uuid,uuid),public.arbor_stop_pattern_hop_run(uuid,uuid,uuid),public.arbor_commit_pattern_hop_checkpoint(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
