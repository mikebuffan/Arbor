import { describe, expect, it, vi } from "vitest";
import { ArkExecutorRegistry } from "../ark/executorRegistry";
import type { ArkClaim } from "../ark/types";
import type { ResearchSession, ResearchUnitReceipt } from "./sessionPolicy";
import type { ResearchClaim, ResearchStore } from "./sessionRunner";
import {
  ARK_RESEARCH_TASK_KIND, registerArkResearchSessionExecutor,
  type AuthorizedResearchBinding,
} from "./registerArkResearchSessionExecutor";

const instant = "2026-09-23T19:00:00.000Z";
const claim: ArkClaim = {
  objective: {
    id:"research-objective",userId:"owner-A",projectId:"research-project",
    goal:"Benign source pilot",status:"running",priority:0,
    budget:{maxTasksPerCycle:2,maxRuntimeMs:25000,maxAttemptsPerTask:3},
    blocker:null,completionEvidence:null,version:0,
    createdAt:instant,updatedAt:instant,
  },
  task: {
    id:"ark-task",objectiveId:"research-objective",userId:"owner-A",
    projectId:"research-project",taskKey:"research-batch-1",
    kind:ARK_RESEARCH_TASK_KIND,description:"Process next reviewed unit",
    status:"running",dependencies:[],payload:{sessionId:"research-session"},
    result:null,attemptCount:1,maxAttempts:3,idempotencyKey:"ark-idempotency",
    availableAt:instant,leaseOwner:"worker-A",leaseToken:"lease-A",
    leaseExpiresAt:instant,heartbeatAt:instant,checkpointSequence:2,
    version:0,createdAt:instant,updatedAt:instant,
  },
};
const session:ResearchSession={
  id:"research-session",userId:"owner-A",projectId:"research-project",
  objective:"Benign source pilot",status:"queued",
  startedAt:"2026-09-23T18:40:00.000Z",
  deadlineAt:"2026-09-23T19:40:00.000Z",
  maxWorkUnits:2,consumedWorkUnits:0,maxCostCents:1,
  committedCostCents:0,authorized:true,cancellationRequested:false,
  unresolvedRequiredWork:2,completedEvidenceRefs:[],
};
const researchClaim:ResearchClaim={
  unitId:"research-unit-1",leaseToken:"research-lease-1",
  idempotencyKey:"research-unit-key",kind:"synthetic_evidence",
  payload:{source:"synthetic-only"},maxCostReservationCents:0,
};
const receipt:ResearchUnitReceipt={
  sessionId:session.id,unitId:researchClaim.unitId,
  idempotencyKey:researchClaim.idempotencyKey,status:"completed",
  recordedAt:instant,costCents:0,evidenceRefs:["synthetic:page:1"],
  unresolvedRequiredWork:1,
};
function binding(storeOverride?:Partial<ResearchStore>):AuthorizedResearchBinding{
  return {
    handoff:{
      ownerId:claim.task.userId,projectId:claim.task.projectId,
      sessionId:session.id,objectiveId:claim.objective.id,
      authorizationVersion:"1",sourceAccessApproved:true,
      privacyReviewRequired:true,
    },
    store:{
      loadSession:vi.fn(async()=>session),
      claimOne:vi.fn(async()=>researchClaim),
      settle:vi.fn(async()=> "committed" as const),
      stop:vi.fn(async()=>{}),
      ...storeOverride,
    },
    executor:vi.fn(async()=>receipt),
  };
}
function fixture(resolve=vi.fn(async()=>binding())){
  const registry=new ArkExecutorRegistry();
  registerArkResearchSessionExecutor({
    registry,resolveTrustedBinding:resolve,
    now:()=>new Date(instant),
  });
  const executor=registry.get(ARK_RESEARCH_TASK_KIND)!;
  const heartbeat=vi.fn(async()=>{});
  return {executor,heartbeat,resolve};
}
describe("ARK registry -> persisted research tick (source only, no scheduler)",()=>{
  it("processes one unit, keeps provenance refs and checkpoints rather than declaring research complete",async()=>{
    const b=binding();
    const {executor,heartbeat,resolve}=fixture(vi.fn(async()=>b));
    const result=await executor({claim,heartbeat});
    expect(resolve).toHaveBeenCalledOnce();
    expect(heartbeat).toHaveBeenCalledOnce();
    expect(b.store.claimOne).toHaveBeenCalledOnce();
    expect(b.store.settle).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status:"checkpointed",checkpoint:{
        sequence:3,reason:"executor",
        state:{
          kind:"research_session_reference",sessionId:"research-session",
          researchStatus:"committed",
          latestEvidenceRefs:["synthetic:page:1"],
          unresolvedRequiredWork:1,independentReviewVerified:false,
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("verified\":true");
  });
  it("does not turn zero remaining work into independently verified ARK completion",async()=>{
    const b=binding();
    b.executor=vi.fn(async()=>({...receipt,unresolvedRequiredWork:0}));
    const {executor}=fixture(vi.fn(async()=>b));
    const result=await executor({claim,heartbeat:async()=>{}});
    expect(result).toMatchObject({status:"checkpointed",checkpoint:{
      nextAction:"Await independent research completion and source/privacy review.",
      state:{unresolvedRequiredWork:0,independentReviewVerified:false},
    }});
  });
  it("fails before executor on absent binding, wrong owner, or spoofed task scope",async()=>{
    const denied=fixture(vi.fn(async()=>null));
    expect(await denied.executor({claim,heartbeat:denied.heartbeat}))
      .toMatchObject({status:"blocked",blocker:{kind:"external_authority"}});
    expect(denied.heartbeat).not.toHaveBeenCalled();
    const b=binding();
    b.handoff.ownerId="owner-B";
    const wrong=fixture(vi.fn(async()=>b));
    await expect(wrong.executor({claim,heartbeat:wrong.heartbeat}))
      .rejects.toThrow("research_ark_binding_scope_mismatch");
    expect(wrong.heartbeat).not.toHaveBeenCalled();
    const forged=fixture();
    await expect(forged.executor({
      claim:{...claim,task:{...claim.task,projectId:"another-project"}},
      heartbeat:forged.heartbeat,
    })).rejects.toThrow("research_ark_claim_scope_mismatch");
    expect(forged.resolve).not.toHaveBeenCalled();
  });
  it("does not checkpoint uncommitted evidence when research lease is lost",async()=>{
    const b=binding({settle:vi.fn(async()=> "lease_lost" as const)});
    const {executor}=fixture(vi.fn(async()=>b));
    const result=await executor({claim,heartbeat:async()=>{}});
    expect(result).toEqual({
      status:"blocked",blocker:{
        kind:"external_authority",
        message:"Research unit lost its lease; inspect persisted receipt and retry policy.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("synthetic:page:1");
  });
  it("blocks exhausted research pending review instead of endless 60-second ARK checkpoints",async()=>{
    const b=binding({
      loadSession:vi.fn(async()=>({...session,unresolvedRequiredWork:0})),
    });
    const {executor}=fixture(vi.fn(async()=>b));
    const result=await executor({claim,heartbeat:async()=>{}});
    expect(result).toMatchObject({
      status:"blocked",
      blocker:{
        kind:"high_consequence_fork",
        message:"Research units exhausted; independent source/privacy review required.",
      },
    });
    expect(b.store.claimOne).not.toHaveBeenCalled();
    expect(b.store.settle).not.toHaveBeenCalled();
  });
  it("blocks a missing persisted research session without claiming success",async()=>{
    const b=binding({loadSession:async()=>null});
    const {executor}=fixture(vi.fn(async()=>b));
    const result=await executor({claim,heartbeat:async()=>{}});
    expect(result).toMatchObject({status:"blocked",blocker:{kind:"external_authority"}});
    expect(b.store.claimOne).not.toHaveBeenCalled();
  });
});
