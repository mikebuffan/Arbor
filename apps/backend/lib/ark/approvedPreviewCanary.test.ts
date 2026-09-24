import {describe,expect,it,vi} from "vitest";
import {runApprovedArkPreviewCanary} from "./approvedPreviewCanary";

const NOW="2026-09-23T19:00:00.000Z";
const scope={
  ownerId:"owner",projectId:"project",objectiveId:"objective",
  taskId:"task",workerId:"canary-test",
};
function previewFixture(input?:{kind?:string;goal?:string;owner?:string;badEvidence?:boolean;badReceipt?:boolean}){
  const project={id:"project",user_id:input?.owner??"owner"};
  const objective={
    id:"objective",user_id:"owner",project_id:"project",
    goal:input?.goal??"ARK Preview Smoke Test: queued status visibility",
    status:"queued",priority:0,budget:{
      maxTasksPerCycle:1,maxRuntimeMs:25000,maxAttemptsPerTask:3,
    },blocker:null,completion_evidence:null,version:0,
    created_at:NOW,updated_at:NOW,
  };
  const task={
    id:"task",objective_id:"objective",user_id:"owner",project_id:"project",
    task_key:"inspect-preview",kind:input?.kind??"canary.read",
    description:"Read ARK Preview synthetic state",status:"queued",
    dependencies:[],payload:{},result:null,attempt_count:0,
    max_attempts:3,idempotency_key:"canary-once",available_at:NOW,
    lease_owner:null as string|null,lease_token:null as string|null,
    lease_expires_at:null,heartbeat_at:null,checkpoint_sequence:0,
    version:0,created_at:NOW,updated_at:NOW,
  };
  let claimed=0;
  const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
    if(name==="ark_claim_next_task"){
      claimed++;
      task.status="running";
      task.attempt_count++;
      task.lease_owner=String(args.p_worker_id);
      task.lease_token="lease-1";
      objective.status="running";
      return {data:{objective:{...objective},task:{...task}},error:null};
    }
    if(name==="ark_heartbeat_task")return {data:true,error:null};
    if(name==="ark_complete_task"){
      task.result=(input?.badReceipt ? {...args.p_result as Record<string,unknown>,capability:'unexpected.write'} : args.p_result) as never;
      task.status="completed";task.lease_owner=null;task.lease_token=null;
      objective.status="awaiting_verification";
      return {data:{objective:{...objective},task:{...task}},error:null};
    }
    if(name==="ark_verify_objective"){
      objective.status="completed";
      objective.completion_evidence=input?.badEvidence?{gate:'unverified'}:args.p_evidence;
      return {data:{...objective},error:null};
    }
    throw new Error("unexpected_rpc:"+name);
  });
  const from=vi.fn((table:string)=>{
    const where=new Map<string,unknown>();
    const query={
      select:(_columns:string)=>query,
      eq:(field:string,value:unknown)=>{where.set(field,value);return query;},
      order:(_field:string,_options:unknown)=>query,
      limit:(_count:number)=>query,
      maybeSingle:async()=>{
        if(table==="projects"){
          return {data:where.get("id")===project.id?project:null,error:null};
        }
        if(table==="ark_objectives"){
          if(where.get("status")==="awaiting_verification"&&
             objective.status!=="awaiting_verification"){
            return{data:null,error:null};
          }
          return{data:where.get("id")===objective.id?{...objective}:null,error:null};
        }
        return {data:null,error:null};
      },
      then:<TResult1=unknown,TResult2=never>(
        ok?:((value:{data:unknown;error:null})=>TResult1|PromiseLike<TResult1>)|null,
        fail?:((reason:unknown)=>TResult2|PromiseLike<TResult2>)|null,
      )=>Promise.resolve({
        data:table==="ark_tasks"&&where.get("objective_id")===scope.objectiveId
          ?[{...task}]:[],error:null,
      }).then(ok,fail),
    };
    return query;
  });
  return{db:{from,rpc} as never,rpc,from,objective,task,getClaimed:()=>claimed};
}

describe("live-preview canary preflight (mock DB only, NEVER an actual deployment)",()=>{
  it("claims exact task, verifies read and persists a completed ARK receipt",async()=>{
    const f=previewFixture();
    const result=await runApprovedArkPreviewCanary({
      db:f.db,scope,now:()=>new Date(NOW),
    });
    expect(result).toMatchObject({
      claimed:1,completed:1,verifiedObjectives:1,
      taskStatus:"completed",objectiveStatus:"completed",
      receiptVerified:true,
    });
    expect(f.getClaimed()).toBe(1);
    expect(f.task.result).toMatchObject({
      verified:true,capability:"canary.read",
      previewOnly:true,source:"read_only_ark_preview_objective",
    });
    expect(f.rpc.mock.calls.map(x=>x[0])).toEqual([
      "ark_claim_next_task","ark_heartbeat_task",
      "ark_complete_task","ark_verify_objective",
    ]);
  });
  it("never marks live canary receipt verified when persisted result or objective evidence is altered",async()=>{
    for(const variation of [{badReceipt:true},{badEvidence:true}]){
      const f=previewFixture(variation);
      const result=await runApprovedArkPreviewCanary({
        db:f.db,scope,now:()=>new Date(NOW),
      });
      expect(result).toMatchObject({
        claimed:1,completed:1,verifiedObjectives:1,
        receiptVerified:false,
      });
    }
  });
  it("refuses unknown task kind or mismatched owner before any claim",async()=>{
    for(const variant of [{kind:"arbor.agency-tool"},{owner:"wrong-owner"},
      {goal:"unrelated objective"}]){
      const f=previewFixture(variant);
      await expect(runApprovedArkPreviewCanary({
        db:f.db,scope,now:()=>new Date(NOW),
      })).rejects.toThrow(/ark_preview_.*mismatch/);
      expect(f.getClaimed()).toBe(0);
      expect(f.rpc).not.toHaveBeenCalled();
    }
  });
});
