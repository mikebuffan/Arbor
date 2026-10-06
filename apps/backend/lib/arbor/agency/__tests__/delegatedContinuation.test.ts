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
});
