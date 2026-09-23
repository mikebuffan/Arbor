import { describe, expect, it, vi } from "vitest";
import { runTrustedArkResearchTick, type TrustedResearchHandoff } from "./arkResearchHandoff";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchStore } from "./sessionRunner";

const at = "2026-09-23T12:20:00Z";
const session = (): ResearchSession => ({
  id:"synthetic-session",userId:"owner-a",projectId:"project-a",
  objective:"Synthetic public-record comparison",status:"running",
  startedAt:"2026-09-23T12:00:00Z",deadlineAt:"2026-09-23T13:00:00Z",
  maxWorkUnits:3,consumedWorkUnits:0,maxCostCents:30,committedCostCents:0,
  authorized:true,cancellationRequested:false,unresolvedRequiredWork:1,
  completedEvidenceRefs:[],
});
const handoff = (): TrustedResearchHandoff => ({
  ownerId:"owner-a",projectId:"project-a",sessionId:"synthetic-session",
  objectiveId:"objective-a",authorizationVersion:"v1",
  sourceAccessApproved:true,privacyReviewRequired:true,
});
function fixture(s: ResearchSession = session()) {
  const loadSession=vi.fn(async()=>s);
  const claimOne=vi.fn(async()=>({
    unitId:"unit-a",leaseToken:"lease-a",idempotencyKey:"unit-a",
    kind:"synthetic_compare",payload:{},
  }));
  const settle=vi.fn(async()=> "committed" as const);
  const stop=vi.fn(async()=>{});
  const executor=vi.fn(async()=>({
    sessionId:"synthetic-session",unitId:"unit-a",idempotencyKey:"unit-a",
    status:"completed" as const,recordedAt:at,costCents:1,
    evidenceRefs:["synthetic-sha:page-1"],unresolvedRequiredWork:0,
  }));
  const store:ResearchStore={loadSession,claimOne,settle,stop};
  return {store,loadSession,claimOne,settle,stop,executor};
}
describe("research-side ARK boundary (synthetic, no live integration)",()=>{
  it("rejects absent source approval before loading persisted state",async()=>{
    const f=fixture();
    await expect(runTrustedArkResearchTick({
      handoff:{...handoff(),sourceAccessApproved:false},
      store:f.store,executor:f.executor,at,
    })).rejects.toThrow("research_handoff_authorization_required");
    expect(f.loadSession).not.toHaveBeenCalled();
  });
  it("rejects owner/project/session mismatch before claim or execution",async()=>{
    for(const wrong of [
      {...session(),userId:"owner-b"},
      {...session(),projectId:"project-b"},
      {...session(),id:"session-b"},
    ]) {
      const f=fixture(wrong);
      await expect(runTrustedArkResearchTick({
        handoff:handoff(),store:f.store,executor:f.executor,at,
      })).rejects.toThrow("research_handoff_scope_mismatch");
      expect(f.claimOne).not.toHaveBeenCalled();
      expect(f.executor).not.toHaveBeenCalled();
    }
  });
  it("returns a minimal scoped checkpoint without Grove content or completion authority",async()=>{
    const f=fixture();
    const result=await runTrustedArkResearchTick({
      handoff:handoff(),store:f.store,executor:f.executor,at,
    });
    expect(result).toEqual({
      status:"committed",
      checkpoint:{
        kind:"research_checkpoint",ownerId:"owner-a",projectId:"project-a",
        sessionId:"synthetic-session",objectiveId:"objective-a",
        authorizationVersion:"v1",status:"committed",unitId:"unit-a",
        idempotencyKey:"unit-a",receiptStatus:"completed",
        evidenceRefs:["synthetic-sha:page-1"],unresolvedRequiredWork:0,costCents:1,
        independentCorroborationVerified:false,grantsExecution:false,
        completionVerified:false,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/transcript|privateGrant|conversation|attachment|leaseToken|payload/);
    expect(f.loadSession).toHaveBeenCalledTimes(2);
    expect(f.claimOne).toHaveBeenCalledTimes(1);
    expect(f.settle).toHaveBeenCalledTimes(1);
  });
  it("does not project uncommitted evidence after lease loss",async()=>{
    const f=fixture();
    f.settle.mockResolvedValueOnce("lease_lost" as never);
    const result=await runTrustedArkResearchTick({
      handoff:handoff(),store:f.store,executor:f.executor,at,
    });
    expect(result).toEqual({status:"lease_lost",reason:"research_lease_not_committed"});
    expect(JSON.stringify(result)).not.toContain("synthetic-sha:page-1");
  });
  it("reloads STOP from persisted state instead of trusting a stale handoff",async()=>{
    const f=fixture({...session(),status:"cancelled",cancellationRequested:true});
    const result=await runTrustedArkResearchTick({
      handoff:handoff(),store:f.store,executor:f.executor,at,
    });
    expect(result).toEqual({status:"stopped",reason:"cancelled_by_owner"});
    expect(f.claimOne).not.toHaveBeenCalled();
    expect(f.executor).not.toHaveBeenCalled();
    expect(f.stop).not.toHaveBeenCalled();
  });
  it("fences a cross-owner mutation on the second persisted read",async()=>{
    const f=fixture();
    f.loadSession.mockResolvedValueOnce(session())
      .mockResolvedValueOnce({...session(),projectId:"project-b"});
    await expect(runTrustedArkResearchTick({
      handoff:handoff(),store:f.store,executor:f.executor,at,
    })).rejects.toThrow("research_handoff_scope_mismatch");
    expect(f.claimOne).not.toHaveBeenCalled();
  });
  it("does not turn an evidence-free empty queue into a completion receipt",async()=>{
    const f=fixture({...session(),unresolvedRequiredWork:0});
    const result=await runTrustedArkResearchTick({
      handoff:handoff(),store:f.store,executor:f.executor,at,
    });
    expect(result).toEqual({status:"idle",reason:"awaiting_completion_verification"});
    expect(f.claimOne).not.toHaveBeenCalled();
  });
});
