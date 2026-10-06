import { describe, expect, it, vi } from "vitest";
import { runResearchSessionTick, type ResearchClaim, type ResearchStore } from "./sessionRunner";
import type { ResearchSession, ResearchUnitReceipt } from "./sessionPolicy";

const origin = "2026-09-20T12:00:00.000Z";
const advance = (minutes: number) =>
  new Date(Date.parse(origin) + minutes * 60_000).toISOString();

function fixture(): ResearchSession {
  return {
    id: "s1", userId: "u1", projectId: "p1", objective: "June 2009 correspondence",
    status: "running", startedAt: origin, deadlineAt: advance(60),
    maxWorkUnits: 8, consumedWorkUnits: 0, maxCostCents: 100,
    committedCostCents: 0, authorized: true, cancellationRequested: false,
    unresolvedRequiredWork: 4, completedEvidenceRefs: [],
  };
}

function harness() {
  // Represents a persisted store shared by new worker invocations; this is
  // a deterministic test double, NOT a production Postgres implementation.
  let state = fixture();
  const completed = new Set<string>();
  const jobs = ["u1", "u2", "u3", "u4"];
  let lease: { claim: ResearchClaim; until: number } | null = null;
  const claimOne = vi.fn(async ({at, leaseSeconds}: {
    session: ResearchSession; at: string; leaseSeconds: number;
  }): Promise<ResearchClaim|null> => {
    const now = Date.parse(at);
    if (lease && lease.until > now) return null;
    lease = null;
    const unitId = jobs.find(x => !completed.has(x));
    if (!unitId) return null;
    const claim = {
      unitId, leaseToken: "lease:" + now,
      idempotencyKey: "s1:" + unitId,
      kind: "source_fetch", payload: {},
    };
    lease = {claim, until:now + leaseSeconds * 1000};
    return claim;
  });
  const settle = vi.fn(async ({claim,receipt}: {
    session: ResearchSession; claim: ResearchClaim; receipt: ResearchUnitReceipt;
  }): Promise<"committed"|"duplicate"|"lease_lost"> => {
    if (completed.has(claim.unitId)) return "duplicate";
    if (!lease || lease.claim.leaseToken !== claim.leaseToken) return "lease_lost";
    completed.add(claim.unitId);
    state = {
      ...state,
      consumedWorkUnits:state.consumedWorkUnits + 1,
      committedCostCents:state.committedCostCents + receipt.costCents,
      unresolvedRequiredWork:receipt.unresolvedRequiredWork,
      completedEvidenceRefs:[
        ...new Set([...state.completedEvidenceRefs,...receipt.evidenceRefs]),
      ],
    };
    lease = null;
    return "committed";
  });
  const stop = vi.fn(async ({status}: {
    session:ResearchSession;status:"blocked"|"cancelled"|"timebox_ended";reason:string;
  }) => {state={...state,status};});
  const store: ResearchStore = {
    loadSession:async()=>structuredClone(state),
    claimOne,settle,stop,
  };
  return {
    store,claimOne,settle,stop,
    state:()=>state,
    update:(patch:Partial<ResearchSession>)=>{state={...state,...patch};},
  };
}

describe("research session restart simulation",()=>{
  it("continues on later ticks and stops at the hour without false completion",async()=>{
    const h=harness();
    for(let i=0;i<3;i++){
      const at=advance(i*10);
      const result=await runResearchSessionTick({
        sessionId:"s1",at,store:h.store,
        executor:async({claim,session})=>({
          sessionId:session.id,unitId:claim.unitId,
          idempotencyKey:claim.idempotencyKey,status:"completed",
          recordedAt:at,costCents:7,
          evidenceRefs:["EFTA-"+claim.unitId],
          unresolvedRequiredWork:3-i,
        }),
      });
      expect(result.status).toBe("committed");
    }
    expect(h.state().consumedWorkUnits).toBe(3);
    expect(h.state().committedCostCents).toBe(21);
    expect(h.state().completedEvidenceRefs).toHaveLength(3);
    const executor=vi.fn();
    const end=await runResearchSessionTick({
      sessionId:"s1",at:advance(60),store:h.store,executor,
    });
    expect(end).toEqual({status:"stopped",reason:"session_deadline_reached"});
    expect(h.state().status).toBe("timebox_ended");
    expect(h.state().unresolvedRequiredWork).toBe(1);
    expect(executor).not.toHaveBeenCalled();
  });
  it("waits for a crashed worker's lease to expire before resuming",async()=>{
    const h=harness();
    await expect(runResearchSessionTick({
      sessionId:"s1",at:advance(2),store:h.store,
      executor:async()=>{throw new Error("worker interrupted");},
    })).rejects.toThrow("worker interrupted");
    const noDuplicate=await runResearchSessionTick({
      sessionId:"s1",at:advance(3),store:h.store,
      executor:vi.fn(),
    });
    expect(noDuplicate.status).toBe("no_claim");
    const resumed=await runResearchSessionTick({
      sessionId:"s1",at:advance(7),store:h.store,
      executor:async({claim,session})=>({
        sessionId:session.id,unitId:claim.unitId,
        idempotencyKey:claim.idempotencyKey,
        status:"completed",recordedAt:advance(7),
        costCents:9,evidenceRefs:["EFTA00183759"],
        unresolvedRequiredWork:3,
      }),
    });
    expect(resumed.status).toBe("committed");
    expect(h.state().consumedWorkUnits).toBe(1);
  });
  it("does not restart when paused, cancelled, or out of budget",async()=>{
    for(const patch of [
      {status:"paused" as const},
      {cancellationRequested:true},
      {committedCostCents:100},
      {consumedWorkUnits:8},
    ]){
      const h=harness();h.update(patch);
      const executor=vi.fn();
      const result=await runResearchSessionTick({
        sessionId:"s1",at:advance(1),store:h.store,executor,
      });
      expect(result.status).toBe("stopped");
      expect(h.claimOne).not.toHaveBeenCalled();
      expect(executor).not.toHaveBeenCalled();
    }
  });
  it("deduplicates a repeated settlement without charging twice",async()=>{
    const h=harness();
    const claim=await h.store.claimOne({
      session:h.state(),at:advance(2),leaseSeconds:240,
    });
    expect(claim).not.toBeNull();
    const receipt:ResearchUnitReceipt={
      sessionId:"s1",unitId:claim!.unitId,idempotencyKey:claim!.idempotencyKey,
      recordedAt:advance(2),status:"completed",costCents:6,
      evidenceRefs:["EFTA00212948"],unresolvedRequiredWork:3,
    };
    expect(await h.store.settle({session:h.state(),claim:claim!,receipt}))
      .toBe("committed");
    expect(await h.store.settle({session:h.state(),claim:claim!,receipt}))
      .toBe("duplicate");
    expect(h.state().committedCostCents).toBe(6);
    expect(h.state().consumedWorkUnits).toBe(1);
  });
});
