import {describe,expect,it,vi} from "vitest";
import {ArkExecutorRegistry} from "../ark/executorRegistry";
import {runArkWorkerCycle} from "../ark/runner";
import type {ArkStore} from "../ark/store";
import type {ArkCheckpoint,ArkClaim,ArkObjective,ArkTask} from "../ark/types";
import type {ResearchSession,ResearchUnitReceipt} from "./sessionPolicy";
import type {ResearchClaim,ResearchStore} from "./sessionRunner";
import {ARK_RESEARCH_TASK_KIND,registerArkResearchSessionExecutor} from "./registerArkResearchSessionExecutor";

const START=Date.parse("2026-09-23T19:00:00.000Z");
const iso=(ms:number)=>new Date(ms).toISOString();

describe("EXISTING ARK worker -> research persistence across invocations (synthetic only)",()=>{
  it("claims one unit, checkpoints, resumes at the next tick and never reports verified findings",async()=>{
    let clock=START;
    const objective:ArkObjective={
      id:"objective",userId:"owner",projectId:"project",
      goal:"synthetic source batch",status:"queued",priority:0,
      budget:{maxTasksPerCycle:1,maxRuntimeMs:25000,maxAttemptsPerTask:3},
      blocker:null,completionEvidence:null,version:0,
      createdAt:iso(START),updatedAt:iso(START),
    };
    const task:ArkTask={
      id:"ark-task",objectiveId:objective.id,userId:objective.userId,
      projectId:objective.projectId,taskKey:"unit",
      kind:ARK_RESEARCH_TASK_KIND,description:"Process one synthetic research unit",
      status:"queued",dependencies:[],payload:{sessionId:"research-session"},
      result:null,attemptCount:0,maxAttempts:3,idempotencyKey:"ark-once",
      availableAt:iso(START),leaseOwner:null,leaseToken:null,
      leaseExpiresAt:null,heartbeatAt:null,checkpointSequence:0,version:0,
      createdAt:iso(START),updatedAt:iso(START),
    };
    const checkpoints:ArkCheckpoint[]=[];
    const arkStore={
      claimNextTask:vi.fn(async ({workerId}:{workerId:string})=>{
        if(task.status!=="queued"&&task.status!=="checkpointed") return null;
        // Match the deployed ARK SQL claim predicate, not a permissive mock.
        if(task.attemptCount>=task.maxAttempts) return null;
        if(Date.parse(task.availableAt)>clock) return null;
        task.status="running";task.attemptCount++;
        task.leaseOwner=workerId;task.leaseToken="lease-"+task.attemptCount;
        objective.status="running";
        return {objective:{...objective},task:{...task}} as ArkClaim;
      }),
      heartbeat:vi.fn(async()=>true),
      checkpoint:vi.fn(async ({checkpoint}:{checkpoint:ArkCheckpoint})=>{
        expect(checkpoint.sequence).toBe(task.checkpointSequence+1);
        checkpoints.push(checkpoint);
        task.checkpointSequence=checkpoint.sequence;
        task.status="checkpointed";
        task.availableAt=checkpoint.resumeAfter!;
        task.leaseOwner=null;task.leaseToken=null;
        objective.status="checkpointed";
        return {...task};
      }),
      nextObjectiveAwaitingVerification:vi.fn(async()=>null),
      completeTask:vi.fn(async()=>{throw Error("unexpected_ark_completion");}),
      failTask:vi.fn(async()=>{throw Error("unexpected_ark_failure");}),
      blockTask:vi.fn(async()=>{throw Error("unexpected_ark_block");}),
      verifyObjective:vi.fn(async()=>{throw Error("unexpected_ark_verification");}),
      enqueueObjective:vi.fn(async()=>{throw Error("unexpected_ark_enqueue");}),
    } as unknown as ArkStore;
    const session:ResearchSession={
      id:"research-session",userId:"owner",projectId:"project",
      objective:"synthetic source batch",status:"queued",
      startedAt:iso(START),deadlineAt:iso(START+60*60*1000),
      maxWorkUnits:2,consumedWorkUnits:0,maxCostCents:1,committedCostCents:0,
      authorized:true,cancellationRequested:false,
      unresolvedRequiredWork:2,completedEvidenceRefs:[],
    };
    const persisted:ResearchUnitReceipt[]=[];
    const researchStore:ResearchStore={
      loadSession:vi.fn(async()=>({...session,completedEvidenceRefs:[...session.completedEvidenceRefs]})),
      claimOne:vi.fn(async()=>{
        if(session.unresolvedRequiredWork===0)return null;
        return {
          unitId:"unit-"+(session.consumedWorkUnits+1),
          idempotencyKey:"research-"+(session.consumedWorkUnits+1),
          leaseToken:"research-lease-"+(session.consumedWorkUnits+1),
          kind:"synthetic_evidence",payload:{source:"synthetic-only"},
          maxCostReservationCents:0,
        } satisfies ResearchClaim;
      }),
      settle:vi.fn(async ({receipt})=>{
        persisted.push(receipt);
        session.consumedWorkUnits++;
        session.unresolvedRequiredWork=receipt.unresolvedRequiredWork;
        session.completedEvidenceRefs.push(...receipt.evidenceRefs);
        session.status="running";
        return "committed" as const;
      }),
      stop:vi.fn(async()=>{throw Error("unexpected_research_stop");}),
    };
    const registry=new ArkExecutorRegistry();
    registerArkResearchSessionExecutor({
      registry,now:()=>new Date(clock),
      resolveTrustedBinding:async () => ({
        handoff:{
          ownerId:objective.userId,projectId:objective.projectId,
          objectiveId:objective.id,sessionId:session.id,
          authorizationVersion:"1",sourceAccessApproved:true,
          privacyReviewRequired:true,
        },
        store:researchStore,
        executor:async ({session:s,claim:c})=>({
          sessionId:s.id,unitId:c.unitId,idempotencyKey:c.idempotencyKey,
          status:"completed",recordedAt:iso(clock),costCents:0,
          evidenceRefs:["synthetic:page:"+c.unitId],
          unresolvedRequiredWork:s.unresolvedRequiredWork-1,
        }),
      }),
    });
    const cycle=(workerId:string)=>runArkWorkerCycle({
      store:arkStore,executors:registry,workerId,objectiveId:objective.id,
      maxTasks:1,now:()=>new Date(clock),
    });
    const first=await cycle("worker-one");
    expect(first.checkpointed).toBe(1);
    expect(first.completed).toBe(0);
    expect(persisted).toHaveLength(1);
    expect(checkpoints[0].state).toMatchObject({
      kind:"research_session_reference",unresolvedRequiredWork:1,
      latestEvidenceRefs:["synthetic:page:unit-1"],
      independentReviewVerified:false,
    });
    clock+=61_000;
    const second=await cycle("worker-two");
    expect(second.checkpointed).toBe(1);
    expect(second.completed).toBe(0);
    expect(persisted).toHaveLength(2);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[1]).toMatchObject({
      sequence:2,
      nextAction:"Await independent research completion and source/privacy review.",
      state:{unresolvedRequiredWork:0,independentReviewVerified:false},
    });
    expect(session.completedEvidenceRefs).toEqual([
      "synthetic:page:unit-1","synthetic:page:unit-2",
    ]);
    expect(arkStore.completeTask).not.toHaveBeenCalled();
    expect(arkStore.verifyObjective).not.toHaveBeenCalled();
    expect(objective.status).toBe("checkpointed");
    expect(task.attemptCount).toBe(2);
  });
});
