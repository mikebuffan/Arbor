-- PROPOSED ONLY. DO NOT AUTO-RUN IN PRODUCTION.
-- Apply after the v1-v4 research schema proposals in a reviewed environment.
-- Purpose: make grants explicit instead of relying on Supabase/Postgres defaults.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname='public' and tablename like 'arbor_research_%'
  loop
    execute format('alter table %I.%I enable row level security',r.schemaname,r.tablename);
    execute format('revoke all privileges on table %I.%I from public, anon, authenticated',r.schemaname,r.tablename);
    execute format('grant all privileges on table %I.%I to service_role',r.schemaname,r.tablename);
  end loop;
end
$$;

-- Only bounded-session status is directly owner-readable. Raw evidence,
-- extraction, identity, graph, packet and review tables remain server-only.
grant select on table
  public.arbor_research_sessions,
  public.arbor_research_units,
  public.arbor_research_receipts
to authenticated;

-- Public RPCs remain in the exposed schema only because server-side supabase-js
-- calls them through PostgREST. They are SECURITY INVOKER and executable only
-- by service_role; no elevated database-owner privilege is needed.
revoke all on function public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)
  from public, anon, authenticated;
revoke all on function public.arbor_settle_research_unit
  (uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)
  from public, anon, authenticated;
revoke all on function public.arbor_stop_research_session
  (uuid,uuid,uuid,text,text)
  from public, anon, authenticated;

grant execute on function public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)
  to service_role;
grant execute on function public.arbor_settle_research_unit
  (uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)
  to service_role;
grant execute on function public.arbor_stop_research_session
  (uuid,uuid,uuid,text,text)
  to service_role;

-- Append-only trigger helper is not an application RPC.
revoke all on function public.arbor_research_reject_history_mutation()
  from public, anon, authenticated;
grant execute on function public.arbor_research_reject_history_mutation()
  to service_role;

comment on function public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer) is
  'Service-role-only SECURITY INVOKER RPC. Uses table grants/RLS; does not elevate to database owner.';
comment on function public.arbor_settle_research_unit
  (uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb) is
  'Service-role-only SECURITY INVOKER RPC. Uses table grants/RLS; does not elevate to database owner.';
comment on function public.arbor_stop_research_session
  (uuid,uuid,uuid,text,text) is
  'Service-role-only SECURITY INVOKER RPC. Uses table grants/RLS; does not elevate to database owner.';
