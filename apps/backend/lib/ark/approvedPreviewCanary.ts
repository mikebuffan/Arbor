/**
 * One-shot, explicitly approved, ARK PREVIEW canary execution.
 * Does NOT register a general tool executor, schedule work, touch research
 * sessions, access any source files, enable chat, or grant capabilities.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArkExecutorRegistry } from "./executorRegistry";
import { runArkWorkerCycle } from "./runner";
import { SupabaseArkStore } from "./supabaseStore";

type PreviewCanaryScope = {
  ownerId: string;
  projectId: string;
  objectiveId: string;
  taskId: string;
  workerId: string;
};

async function requiredSingle(
  db:SupabaseClient, table:"ark_objectives"|"projects",
  id:string,
):Promise<Record<string,unknown>>{
  const {data,error}=await db.from(table).select(
    table==="projects"?"id,user_id":"id,user_id,project_id,goal,status",
  ).eq("id",id).maybeSingle();
  if(error)throw new Error("ark_preview_preflight_read_failed");
  if(!data)throw new Error("ark_preview_preflight_missing_record");
  return data as Record<string,unknown>;
}

/**
 * The authenticated operator supplies verified DB scope, not the model.
 * No wildcard objective claim and no other registered executors.
 */
export async function runApprovedArkPreviewCanary(input:{
  db:SupabaseClient;
  scope:PreviewCanaryScope;
  now?:()=>Date;
}):Promise<{
  claimed:number;completed:number;verifiedObjectives:number;
  taskStatus:string;objectiveStatus:string;receiptVerified:boolean;
}> {
  const {db,scope}=input;
  if(!Object.values(scope).every(x=>typeof x==="string"&&x.length>0)){
    throw new Error("ark_preview_scope_required");
  }
  const project=await requiredSingle(db,"projects",scope.projectId);
  const objective=await requiredSingle(db,"ark_objectives",scope.objectiveId);
  if(project.user_id!==scope.ownerId||
     objective.user_id!==scope.ownerId||
     objective.project_id!==scope.projectId||
     objective.goal!=="ARK Preview Smoke Test: queued status visibility"||
     objective.status!=="queued"){
    throw new Error("ark_preview_preflight_scope_mismatch");
  }
  const {data:tasks,error:taskError}=await db.from("ark_tasks")
    .select("id,objective_id,user_id,project_id,task_key,kind,status,attempt_count")
    .eq("objective_id",scope.objectiveId);
  if(taskError)throw new Error("ark_preview_task_read_failed");
  if(!Array.isArray(tasks)||tasks.length!==1||
     tasks[0].id!==scope.taskId||
     tasks[0].objective_id!==scope.objectiveId||
     tasks[0].user_id!==scope.ownerId||
     tasks[0].project_id!==scope.projectId||
     tasks[0].task_key!=="inspect-preview"||
     tasks[0].kind!=="canary.read"||
     tasks[0].status!=="queued"||
     tasks[0].attempt_count!==0){
    throw new Error("ark_preview_task_scope_mismatch");
  }
  const registry=new ArkExecutorRegistry().register("canary.read",async({claim,heartbeat})=>{
    if(claim.objective.id!==scope.objectiveId||
       claim.task.id!==scope.taskId||
       claim.task.userId!==scope.ownerId||
       claim.task.projectId!==scope.projectId||
       claim.task.kind!=="canary.read"){
      throw new Error("ark_preview_claim_scope_mismatch");
    }
    await heartbeat();
    // The read verifies the actual bound record still exists: no made-up receipt.
    const checked=await requiredSingle(db,"ark_objectives",scope.objectiveId);
    if(checked.id!==scope.objectiveId||
       checked.project_id!==scope.projectId||
       checked.user_id!==scope.ownerId){
      throw new Error("ark_preview_canary_read_scope_mismatch");
    }
    return{status:"completed",result:{
      verified:true,capability:"canary.read",previewOnly:true,
      source:"read_only_ark_preview_objective",
      attempts:1,
    }};
  });
  const store=new SupabaseArkStore(db);
  const cycle=await runArkWorkerCycle({
    store,executors:registry,workerId:scope.workerId,
    objectiveId:scope.objectiveId,maxTasks:1,maxRuntimeMs:20000,
    now:input.now,verifyCompletion:o=>store.assessObjectiveCompletion(o.id),
  });
  const {data:afterTasks,error:afterError}=await db.from("ark_tasks")
    .select("id,status,attempt_count,result,lease_owner")
    .eq("objective_id",scope.objectiveId);
  if(afterError||!afterTasks||afterTasks.length!==1){
    throw new Error("ark_preview_canary_readback_failed");
  }
  const afterObjective=await requiredSingle(db,"ark_objectives",scope.objectiveId);
  const task=afterTasks[0];
  const result=task.result as Record<string,unknown>|null;
  const receiptVerified=cycle.claimed===1&&cycle.completed===1&&
    cycle.verifiedObjectives===1&&task.id===scope.taskId&&
    task.status==="completed"&&task.lease_owner===null&&
    result?.verified===true&&result?.previewOnly===true&&
    afterObjective.status==="completed"&&
    afterObjective.project_id===scope.projectId;
  return{
    claimed:cycle.claimed,completed:cycle.completed,
    verifiedObjectives:cycle.verifiedObjectives,
    taskStatus:String(task.status),
    objectiveStatus:String(afterObjective.status),
    receiptVerified,
  };
}
