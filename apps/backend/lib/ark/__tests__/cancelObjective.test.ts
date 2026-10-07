import {describe,expect,it,vi} from "vitest";
import {cancelArkObjective} from "../cancelObjective";
const userId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222",objectiveId="33333333-3333-4333-8333-333333333333";
describe("durable ARK STOP adapter",()=>{
 it("passes exact owner/project/objective scope and requires cancelled readback",async()=>{
  const rpc=vi.fn(async()=>({data:{id:objectiveId,user_id:userId,project_id:projectId,status:"cancelled",version:4},error:null}));
  await expect(cancelArkObjective({supabase:{rpc} as never,userId,projectId,objectiveId,reason:"User said STOP",now:"2026-10-07T00:00:00Z"}))
   .resolves.toMatchObject({id:objectiveId,userId,projectId,status:"cancelled",version:4});
  expect(rpc).toHaveBeenCalledWith("ark_cancel_objective",{p_objective_id:objectiveId,p_user_id:userId,p_project_id:projectId,p_reason:"User said STOP",p_now:"2026-10-07T00:00:00Z"});
 });
 it("rejects blank reasons and foreign or non-cancelled readback",async()=>{
  const rpc=vi.fn();
  await expect(cancelArkObjective({supabase:{rpc} as never,userId,projectId,objectiveId,reason:"   "})).rejects.toThrow("reason_required");
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValue({data:{id:objectiveId,user_id:"foreign",project_id:projectId,status:"cancelled",version:1},error:null});
  await expect(cancelArkObjective({supabase:{rpc} as never,userId,projectId,objectiveId,reason:"stop"})).rejects.toThrow("scope_or_state_mismatch");
 });
 it("propagates storage denial instead of reporting STOP complete",async()=>{
  const rpc=vi.fn(async()=>({data:null,error:{code:"42501"}}));
  await expect(cancelArkObjective({supabase:{rpc} as never,userId,projectId,objectiveId,reason:"stop"})).rejects.toEqual({code:"42501"});
 });
});
