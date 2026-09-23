import { describe, expect, it, vi } from "vitest";
import { runResearchSessionTick, type ResearchClaim, type ResearchStore } from "./sessionRunner";
import type { ResearchSession, ResearchUnitReceipt } from "./sessionPolicy";

// Deliberately synthetic, deterministic and in-process: NOT a real database or source fetch.
const start = "2026-09-20T12:00:00.000Z";
const at = (minute: number) => new Date(Date.parse(start) + minute * 60_000).toISOString();
function rehearsal() {
  let session: ResearchSession = {
    id:"synthetic-session",userId:"synthetic-owner",projectId:"synthetic-project",
    objective:"synthetic evidence rehearsal",status:"queued",
    startedAt:start,deadlineAt:at(60),maxWorkUnits:2,consumedWorkUnits:0,
    maxCostCents:4,committedCostCents:0,authorized:true,
    cancellationRequested:false,unresolvedRequiredWork:2,completedEvidenceRefs:[],
  };
  let lease: { claim:ResearchClaim; expires:number } | null = null;
  const receipts:ResearchUnitReceipt[] = [];
  const store:ResearchStore = {
    loadSession:async(id)=>id===session.id?structuredClone(session):null,
    claimOne:async({at:now,leaseSeconds})=>{
      if(session.cancellationRequested || !session.authorized ||
        !["queued","running"].includes(session.status) ||
        Date.parse(now)>=Date.parse(session.deadlineAt)) return null;
      if(lease && Date.parse(now)<lease.expires) return null;
      const unitId = "synthetic-unit-" + (session.consumedWorkUnits+1);
      const claim:ResearchClaim = {
        unitId,leaseToken:"synthetic-token-"+Date.parse(now),
        idempotencyKey:unitId,kind:"synthetic_evidence",payload:{source:"synthetic-only"},
        maxCostReservationCents:2,
      };
      lease={claim,expires:Date.parse(now)+leaseSeconds*1000};
      session={...session,status:"running"};
      return claim;
    },
    settle:async({claim,receipt})=>{
      if(receipts.some(x=>x.unitId===claim.unitId&&x.idempotencyKey===claim.idempotencyKey))
        return "duplicate";
      if(!lease || lease.claim.leaseToken!==claim.leaseToken ||
        session.cancellationRequested || !session.authorized ||
        !["queued","running"].includes(session.status)) return "lease_lost";
      receipts.push(receipt);
      session={...session,consumedWorkUnits:session.consumedWorkUnits+1,
        committedCostCents:session.committedCostCents+receipt.costCents,
        unresolvedRequiredWork:receipt.unresolvedRequiredWork,
        completedEvidenceRefs:[...new Set([...session.completedEvidenceRefs,...receipt.evidenceRefs])]};
      lease=null;
      return "committed";
    },
    stop:async({status})=>{session={...session,status,
      cancellationRequested:status==="cancelled"||session.cancellationRequested};},
  };
  const executor=vi.fn(async({session:s,claim}:{
    session:ResearchSession;claim:ResearchClaim;
  }):Promise<ResearchUnitReceipt>=>({
    sessionId:s.id,unitId:claim.unitId,idempotencyKey:claim.idempotencyKey,
    status:"completed",recordedAt:at(1),costCents:2,
    evidenceRefs:["synthetic:page:"+claim.unitId],
    unresolvedRequiredWork:s.unresolvedRequiredWork-1,
  }));
  const tick=(minute:number,exec=executor)=>runResearchSessionTick({
    sessionId:session.id,store,executor:exec,at:at(minute),
  });
  return {store,tick,executor,session:()=>session,receipts,stop:()=>store.stop({
    session,status:"cancelled",reason:"synthetic operator STOP",
  })};
}

describe("synthetic one-tick worker rehearsal",()=>{
  it("persists one receipt per invocation, then idles without claiming completion",async()=>{
    const h=rehearsal();
    expect((await h.tick(1)).status).toBe("committed");
    expect(h.receipts).toHaveLength(1);
    expect(h.session().consumedWorkUnits).toBe(1);
    expect(h.session().committedCostCents).toBe(2);
    expect((await h.tick(2)).status).toBe("committed");
    expect(h.receipts).toHaveLength(2);
    expect(h.session().completedEvidenceRefs).toHaveLength(2);
    expect(await h.tick(3)).toEqual({
      status:"stopped",reason:"work_unit_budget_exhausted",
    });
    expect(h.session().status).toBe("timebox_ended");
    expect(h.session().status).not.toBe("completed");
    expect(h.executor).toHaveBeenCalledTimes(2);
  });
  it("STOP after claim fences settlement; no false receipt or charge",async()=>{
    const h=rehearsal();
    const executor=vi.fn(async(args:Parameters<typeof h.executor>[0])=>{
      await h.stop();
      return h.executor(args);
    });
    const result=await h.tick(1,executor);
    expect(result.status).toBe("lease_lost");
    expect(h.receipts).toHaveLength(0);
    expect(h.session().committedCostCents).toBe(0);
    expect((await h.tick(2)).status).toBe("stopped");
    expect(h.executor).toHaveBeenCalledTimes(1);
  });
  it("crashed worker cannot duplicate active lease; later tick can recover",async()=>{
    const h=rehearsal();
    await expect(h.tick(1,async()=>{throw Error("synthetic worker crash");}))
      .rejects.toThrow("synthetic worker crash");
    expect(h.receipts).toHaveLength(0);
    expect((await h.tick(2)).status).toBe("no_claim");
    expect((await h.tick(6)).status).toBe("committed");
    expect(h.receipts).toHaveLength(1);
    expect(h.session().consumedWorkUnits).toBe(1);
  });
  it("rejects unsupported evidence-free completion without charging",async()=>{
    const h=rehearsal();
    await expect(h.tick(1,async({session,claim})=>({
      sessionId:session.id,unitId:claim.unitId,idempotencyKey:claim.idempotencyKey,
      status:"completed" as const,recordedAt:at(1),costCents:2,
      evidenceRefs:[],unresolvedRequiredWork:session.unresolvedRequiredWork-1,
    }))).rejects.toThrow("research_completion_without_evidence");
    expect(h.receipts).toHaveLength(0);
    expect(h.session().consumedWorkUnits).toBe(0);
  });
});
