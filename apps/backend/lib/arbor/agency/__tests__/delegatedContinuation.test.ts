import { describe, expect, it, vi } from "vitest";
import { runOpenAIAgencyAgent } from "../openaiAgent";
import { AgencyToolRegistry } from "../tools";

describe("delegated continuation", () => {
  it("resumes checkpointed delegated work before returning a user-visible turn", async () => {
    const tools = new AgencyToolRegistry();
    tools.register({
      name:"state_inspect", description:"inspect", parameters:{type:"object",properties:{},additionalProperties:false}, risk:"read",
      execute: vi.fn(),
    } as never);
    let createCount=0;
    const createResponse=vi.fn(async (request:any)=>{
      createCount++;
      if(createCount===1) return {id:"r1",output:[{type:"function_call",call_id:"c1",name:"state_inspect",arguments:"{}"}],output_text:"",status:"completed"};
      return {id:"r2",output:[],output_text:"finished",status:"completed"};
    });
    let retries=0;
    const executionDelegate={
      managesWriteIdempotency:true,
      execute:vi.fn(async()=>({
        kind:"checkpointed" as const, reason:"internal",
        retry:async()=>{retries++;return {kind:"outcome" as const,outcome:{ok:true,result:{done:true},attempts:1,recoveredFailures:[]}};},
      })),
    };
    const result=await runOpenAIAgencyAgent({
      instructions:"finish", goal:"finish", userText:"go", tools,
      context:{userId:"u",projectId:"p",conversationId:"c",turnId:"t"},
      responseCreate:createResponse as never, verifyCompletion:false, executionDelegate,
    });
    expect(retries).toBe(1);
    expect(result.status).toBe("complete");
    expect(result.text).toBe("finished");
  });
  it("crosses two durable checkpoints and completes without a second user prompt", async () => {
    const tools = new AgencyToolRegistry();
    tools.register({ name:"state_inspect", description:"inspect", parameters:{type:"object",properties:{},additionalProperties:false}, risk:"read", execute:vi.fn() } as never);
    let modelCalls=0;
    const createResponse=vi.fn(async()=>{
      modelCalls++;
      return modelCalls===1
        ? {id:"m1",output:[{type:"function_call",call_id:"call",name:"state_inspect",arguments:"{}"}],output_text:"",status:"completed"}
        : {id:"m2",output:[],output_text:"parent goal complete",status:"completed"};
    });
    let checkpoint=0;
    const executionDelegate={managesWriteIdempotency:true,execute:vi.fn(async()=>{
      const resume=async():Promise<any>=>{
        checkpoint++;
        return checkpoint<2
          ? {kind:"checkpointed",reason:"durable checkpoint",objectiveId:"objective-1",retry:resume}
          : {kind:"outcome",outcome:{ok:true,result:{objectiveId:"objective-1",complete:true},attempts:1,recoveredFailures:[]}};
      };
      return {kind:"checkpointed" as const,reason:"durable checkpoint",objectiveId:"objective-1",retry:resume};
    })};
    const result=await runOpenAIAgencyAgent({instructions:"finish",goal:"finish parent goal",userText:"start",tools,
      context:{userId:"u",projectId:"p",conversationId:"c",turnId:"same-turn"},responseCreate:createResponse as never,
      verifyCompletion:false,executionDelegate});
    expect(checkpoint).toBe(2);
    expect(result).toMatchObject({status:"complete",text:"parent goal complete"});
    expect(executionDelegate.execute).toHaveBeenCalledTimes(1);
  });

});
