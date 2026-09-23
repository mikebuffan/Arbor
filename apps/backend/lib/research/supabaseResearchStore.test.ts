import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseResearchStore } from "./supabaseResearchStore";
import type { ResearchSession } from "./sessionPolicy";

const record = {
  id:"s1",user_id:"owner-1",project_id:"project-1",
  objective:"NPA correspondence",status:"running",
  started_at:"2026-09-20T12:00:00Z",deadline_at:"2026-09-20T13:00:00Z",
  max_work_units:10,consumed_work_units:1,max_cost_cents:100,
  committed_cost_cents:4,authorized:true,cancellation_requested:false,
  unresolved_required_work:5,completed_evidence_refs:["EFTA00183759"],
};

function mockDb(result:Record<string,unknown>|null=record){
  const query={
    select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(async()=>({data:result,error:null})),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const rpc=vi.fn(async(name:string)=>{
    if(name==="arbor_claim_research_unit"){
      return {data:{
        unitId:"unit-1",leaseToken:"lease-1",idempotencyKey:"unit-1",
        kind:"source_fetch",payload:{uri:"https://example.org/"},
        maxCostReservationCents:12,
      },error:null};
    }
    if(name==="arbor_settle_research_unit"){
      return {data:"committed",error:null};
    }
    if(name==="arbor_stop_research_session"){
      return {data:true,error:null};
    }
    return {data:null,error:{message:"unexpected rpc"}};
  });
  const from=vi.fn(()=>query);
  return { db:{from,rpc} as unknown as SupabaseClient,query,rpc,from };
}

describe("owner-scoped Supabase research adapter",()=>{
  it("pins all reads to the server-resolved owner and project",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=await store.loadSession("s1");
    expect(session).toMatchObject({
      id:"s1",userId:"owner-1",projectId:"project-1",
    });
    expect(m.query.eq.mock.calls).toEqual([
      ["id","s1"],["user_id","owner-1"],["project_id","project-1"],
    ]);
  });

  it("rejects a row from the wrong owner even if the query adapter leaks it",async()=>{
    const m=mockDb({...record,user_id:"someone-else"});
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    await expect(store.loadSession("s1")).rejects
      .toThrow("research_owner_scope_mismatch");
  });

  it("returns null when no scoped session exists",async()=>{
    const m=mockDb(null);
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    expect(await store.loadSession("missing")).toBeNull();
  });

  it("fails closed on malformed persisted authorization booleans",async()=>{
    for (const bad of [
      {...record,authorized:"true"},
      {...record,cancellation_requested:0},
      {...record,authorized:null},
    ]) {
      const m=mockDb(bad as unknown as Record<string,unknown>);
      const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
      await expect(store.loadSession("s1")).rejects.toThrow(/invalid_research_db_(authorized|cancellation_requested)/);
      expect(m.rpc).not.toHaveBeenCalled();
    }
  });

  it("fails closed instead of filtering malformed persisted evidence refs",async()=>{
    for (const completed_evidence_refs of [
      ["EFTA00183759",42],
      ["EFTA00183759"," "],
      null,
    ]) {
      const m=mockDb({...record,completed_evidence_refs} as unknown as Record<string,unknown>);
      const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
      await expect(store.loadSession("s1")).rejects
        .toThrow("invalid_research_db_completed_evidence_refs");
      expect(m.rpc).not.toHaveBeenCalled();
    }
  });

  it("includes identity, lease, and budget reservation on claims",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=(await store.loadSession("s1")) as ResearchSession;
    expect(await store.claimOne({
      session,at:"2026-09-20T12:20:00Z",leaseSeconds:240,
    })).toMatchObject({
      unitId:"unit-1",leaseToken:"lease-1",maxCostReservationCents:12,
    });
    expect(m.rpc).toHaveBeenCalledWith("arbor_claim_research_unit",{
      p_session_id:"s1",p_user_id:"owner-1",p_project_id:"project-1",
      p_worker_id:"worker-1",p_lease_seconds:240,
    });
  });

  it("requires the database to acknowledge STOP persistence",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=(await store.loadSession("s1")) as ResearchSession;
    m.rpc.mockResolvedValueOnce({data:false,error:null});
    await expect(store.stop({
      session,status:"cancelled",reason:"synthetic operator stop",
    })).rejects.toThrow("research_stop_not_persisted");
    expect(m.rpc).toHaveBeenCalledWith("arbor_stop_research_session",{
      p_session_id:"s1",p_user_id:"owner-1",p_project_id:"project-1",
      p_status:"cancelled",p_reason:"synthetic operator stop",
    });
  });

  it("rejects an attempt to settle under a different owner",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session={...(await store.loadSession("s1"))!,userId:"owner-2"};
    await expect(store.settle({
      session,
      claim:{
        unitId:"unit-1",leaseToken:"lease-1",
        idempotencyKey:"unit-1",kind:"source_fetch",payload:{},
      },
      receipt:{
        sessionId:"s1",unitId:"unit-1",idempotencyKey:"unit-1",
        status:"completed",recordedAt:"2026-09-20T12:20:00Z",
        costCents:1,evidenceRefs:["EFTA00183759"],unresolvedRequiredWork:4,
      },
    })).rejects.toThrow("research_owner_scope_mismatch");
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
