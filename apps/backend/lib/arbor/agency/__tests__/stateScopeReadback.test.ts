import { describe, expect, it, vi } from "vitest";
import { loadAgencyState } from "../state";

const userId = "synthetic-owner", projectId = "synthetic-project";
const objective = { parentGoal:"Finish authorized objective", status:"checkpointed",
  revision:1, completionCriteria:["verify"], standingAuthorization:[],
  hardStops:[], nextAction:"check", checkpoint:"saved" };

function database(runtime: unknown, checkpoint: unknown = null) {
  const calls: Record<string, Array<[string,unknown]>> = {};
  const from = vi.fn((table: string) => {
    const filters: Array<[string,unknown]> = [];
    calls[table] = filters;
    const q: any = {};
    q.select = q.order = q.limit = () => q;
    q.eq = (key:string,val:unknown) => { filters.push([key,val]); return q; };
    q.maybeSingle = async () => ({
      data: table === "arbor_runtime_state" ? runtime : checkpoint, error:null
    });
    return q;
  });
  return {supabase:{from} as never, from, calls};
}
const load=(supabase: ReturnType<typeof database>["supabase"]) =>
  loadAgencyState({supabase,userId,projectId});

describe("Group 5 agency startup scope isolation",()=>{
  it("reads valid scoped durable goal without checkpoint fallback",async()=>{
    const d=database({user_id:userId,project_id:projectId,
      agency_goal:"Finish authorized objective",agency_status:"checkpointed",
      agency_current_step:4,agency_unresolved_work:["verify"],
      agency_recurring_weaknesses:[],agency_strategy_notes:[],
      agency_blocker:null,agency_objective:objective});
    const result=await load(d.supabase);
    expect(result).toMatchObject({goal:"Finish authorized objective",
      status:"checkpointed",currentStep:4,objective:{revision:1}});
    expect(d.calls.arbor_runtime_state).toContainEqual(["user_id",userId]);
    expect(d.calls.arbor_runtime_state).toContainEqual(["project_id",projectId]);
    expect(d.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    {user_id:"foreign",project_id:projectId},
    {user_id:userId,project_id:"foreign"},
    {user_id:undefined,project_id:projectId}
  ])("rejects mismatched runtime readback %j",async scope=>{
    const d=database({...scope,agency_goal:"SECRET-FOREIGN",
      agency_status:"active",agency_current_step:1,agency_objective:objective});
    expect(await load(d.supabase)).toBeNull();
    expect(d.from).toHaveBeenCalledTimes(1);
  });
  it("recovers a correctly scoped append-only checkpoint",async()=>{
    const d=database(null,{user_id:userId,project_id:projectId,
      agency_status:"checkpointed",current_step:6,
      unresolved_work:["verify proof"],objective});
    expect(await load(d.supabase)).toMatchObject({
      goal:"Finish authorized objective",currentStep:6,
      unresolvedWork:["verify proof"]
    });
    expect(d.calls.arbor_agency_checkpoints).toContainEqual(["user_id",userId]);
    expect(d.calls.arbor_agency_checkpoints).toContainEqual(["project_id",projectId]);
  });
  it("rejects foreign and missing-scope checkpoint readbacks",async()=>{
    for(const scope of [
      {user_id:"foreign",project_id:projectId},
      {user_id:userId,project_id:"foreign"},
      {user_id:null,project_id:projectId}
    ]) {
      const d=database(null,{...scope,agency_status:"checkpointed",
        current_step:1,unresolved_work:["SECRET-WORK"],objective});
      expect(await load(d.supabase)).toBeNull();
    }
  });
});
