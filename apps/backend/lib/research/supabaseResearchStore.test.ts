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
  it("loads controller queue/receipt context under the same owner/project scope",async()=>{
    const sessionQuery={
      select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(async()=>({data:record,error:null})),
    };
    sessionQuery.select.mockReturnValue(sessionQuery);
    sessionQuery.eq.mockReturnValue(sessionQuery);

    function listQuery(data:unknown[]) {
      const q:any={
        select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(),
        then:(resolve:any,reject:any)=>Promise.resolve({data,error:null}).then(resolve,reject),
      };
      q.select.mockReturnValue(q); q.eq.mockReturnValue(q);
      q.order.mockReturnValue(q); q.limit.mockReturnValue(q);
      return q;
    }
    const units=listQuery([{
      unit_key:"follow-a",kind:"research.timeline",status:"queued",
      attempt_count:0,max_attempts:3,
    }]);
    const receipts=listQuery([{
      idempotency_key:"done-a",status:"completed",
      evidence_refs:["synthetic:evidence"],recorded_at:"2026-09-20T12:10:00Z",
      result:{
        discoveryLeads:[{
          id:"bridge-a",
          kind:"bridge_node",
          status:"hypothesis",
        }],
      },
    }]);
    const from=vi.fn((table:string)=>{
      if(table==="arbor_research_sessions")return sessionQuery;
      if(table==="arbor_research_units")return units;
      if(table==="arbor_research_receipts")return receipts;
      throw new Error("unexpected table "+table);
    });
    const db={from,rpc:vi.fn()} as unknown as SupabaseClient;
    const store=new SupabaseResearchStore(db,"owner-1","project-1","worker-1");

    expect(await store.loadControllerContext("s1")).toMatchObject({
      session:{id:"s1",userId:"owner-1",projectId:"project-1"},
      units:[{unitKey:"follow-a",kind:"research.timeline",status:"queued"}],
      recentReceipts:[{
        unitKey:"done-a",status:"completed",
        evidenceRefs:["synthetic:evidence"],
        result:{
          discoveryLeads:[{
            id:"bridge-a",
            kind:"bridge_node",
            status:"hypothesis",
          }],
        },
      }],
    });
  });

  it("retains the scoped latest follow-up plan outside the recent receipt window",async()=>{
    const m=mockDb();
    const plan={idempotency_key:"old-plan",status:"completed",evidence_refs:["basis"],
      recorded_at:"2026-09-20T12:00:00Z",result:{caseworkKind:"followup_plan",caseworkOutput:{schemaVersion:1}}};
    const queries:any[]=[];
    let receiptQueries=0;
    m.from.mockImplementation((table:string)=>{
      if(table==="arbor_research_sessions") return m.query;
      const data=table==="arbor_research_units" ? [] : (++receiptQueries===1
        ? [{idempotency_key:"recent",status:"completed",evidence_refs:["new"],
          recorded_at:"2026-09-20T12:20:00Z",result:{}}] : [plan]);
      const q:any={select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(),
        then:(resolve:any,reject:any)=>Promise.resolve({data,error:null}).then(resolve,reject)};
      q.select.mockReturnValue(q);q.eq.mockReturnValue(q);q.order.mockReturnValue(q);q.limit.mockReturnValue(q);
      queries.push(q);return q;
    });
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const context=await store.loadControllerContext("s1");
    expect(context?.recentReceipts.map(r=>r.unitKey)).toEqual(["recent","old-plan"]);
    expect(queries[2].eq.mock.calls).toEqual([["session_id","s1"],["user_id","owner-1"],
      ["project_id","project-1"],["status","completed"],["result->>caseworkKind","followup_plan"]]);
    expect(queries[2].limit).toHaveBeenCalledWith(1);
  });

  it("sends controller-planned units only through the scoped append RPC",async()=>{
    const m=mockDb();
    m.rpc.mockImplementation(async(name:string,args:any)=>{
      if(name==="arbor_append_research_units"){
        return {data:{appended:1,existing:0},error:null};
      }
      return {data:null,error:{message:"unexpected rpc"}};
    });
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=(await store.loadSession("s1")) as ResearchSession;

    expect(await store.appendPlannedUnits({
      session,
      units:[{
        unitKey:"follow-a",
        kind:"research.timeline",
        description:"Follow one bounded timeline question.",
        payload:{lead:"synthetic"},
        maxCostReservationCents:2,
        maxAttempts:3,
      }],
    })).toEqual({appended:1,existing:0});

    expect(m.rpc).toHaveBeenCalledWith("arbor_append_research_units",{
      p_session_id:"s1",
      p_user_id:"owner-1",
      p_project_id:"project-1",
      p_units:[{
        unitKey:"follow-a",
        kind:"research.timeline",
        description:"Follow one bounded timeline question.",
        payload:{lead:"synthetic"},
        maxCostReservationCents:2,
        maxAttempts:3,
      }],
    });
  });

  it("returns the prior structured unit result on a resumed claim",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=(await store.loadSession("s1")) as ResearchSession;

    m.rpc.mockResolvedValueOnce({
      data:{
        unitId:"unit-1",
        leaseToken:"lease-2",
        idempotencyKey:"unit-1",
        kind:"research.pattern_hop",
        payload:{seed:"synthetic"},
        maxCostReservationCents:0,
        lastResult:{
          patternHopRunId:"pattern-run-1",
          patternHopStatus:"active",
        },
      },
      error:null,
    });

    expect(await store.claimOne({
      session,
      at:"2026-09-20T12:21:00Z",
      leaseSeconds:240,
    })).toMatchObject({
      kind:"research.pattern_hop",
      lastResult:{
        patternHopRunId:"pattern-run-1",
        patternHopStatus:"active",
      },
    });
  });

  it("persists structured executor resume state alongside the receipt timestamp",async()=>{
    const m=mockDb();
    const store=new SupabaseResearchStore(m.db,"owner-1","project-1","worker-1");
    const session=(await store.loadSession("s1")) as ResearchSession;

    await expect(store.settle({
      session,
      claim:{
        unitId:"unit-1",
        leaseToken:"lease-1",
        idempotencyKey:"unit-1",
        kind:"research.pattern_hop",
        payload:{seed:"synthetic"},
        maxCostReservationCents:0,
      },
      receipt:{
        sessionId:"s1",
        unitId:"unit-1",
        idempotencyKey:"unit-1",
        status:"checkpointed",
        recordedAt:"2026-09-20T12:20:00Z",
        costCents:0,
        evidenceRefs:["synthetic:evidence"],
        unresolvedRequiredWork:5,
        result:{
          patternHopRunId:"pattern-run-1",
          patternHopStatus:"active",
        },
      },
    })).resolves.toBe("committed");

    expect(m.rpc).toHaveBeenCalledWith("arbor_settle_research_unit",{
      p_session_id:"s1",
      p_user_id:"owner-1",
      p_project_id:"project-1",
      p_unit_id:"unit-1",
      p_lease_token:"lease-1",
      p_idempotency_key:"unit-1",
      p_status:"checkpointed",
      p_cost_cents:0,
      p_evidence_refs:["synthetic:evidence"],
      p_unresolved_required_work:5,
      p_result:{
        patternHopRunId:"pattern-run-1",
        patternHopStatus:"active",
        receipt_recorded_at:"2026-09-20T12:20:00Z",
      },
    });
  });

});
