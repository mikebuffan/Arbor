import {afterEach,describe,expect,it} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {buildBoundedHistoricalPlan,verifyBoundedHistoricalPlan} from "../../../scripts/import_chatgpt/boundedPlan";
const dirs:string[]=[];
const userId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222";
const selection=[{sourceThreadId:"thread",sourceMessageId:"m"}];
async function setup(){const dir=await fs.mkdtemp(path.join(os.tmpdir(),"arbor-plan-"));dirs.push(dir);
 const file=path.join(dir,"export.json");await fs.writeFile(file,JSON.stringify([{id:"thread",current_node:"m",mapping:{
  m:{parent:null,message:{id:"m",author:{role:"user"},content:{parts:["humor"]},create_time:1}}}}]));
 return {files:[file],userId,projectId,selection};}
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>fs.rm(d,{recursive:true,force:true})));});
describe("bounded historical import plan",()=>{
 it("binds exact source bytes, owner, project, identity and message position",async()=>{
  const input=await setup(),plan=await buildBoundedHistoricalPlan(input);
  expect(plan.turns[0]).toMatchObject({sourceThreadId:"thread",sourceMessageId:"m",sourceMessageIndex:0,content:"humor"});
  expect(await verifyBoundedHistoricalPlan({...input,plan})).toEqual(plan);
  expect((await buildBoundedHistoricalPlan(input)).fingerprint).toBe(plan.fingerprint);
 });
 it("rejects changed owner/project and altered payload",async()=>{
  const input=await setup(),plan=await buildBoundedHistoricalPlan(input);
  await expect(verifyBoundedHistoricalPlan({...input,plan,userId:projectId})).rejects.toThrow("scope_mismatch");
  await expect(verifyBoundedHistoricalPlan({...input,plan,projectId:userId})).rejects.toThrow("scope_mismatch");
  await expect(verifyBoundedHistoricalPlan({...input,plan:{...plan,turns:[]}})).rejects.toThrow("payload_changed");
 });
 it("rejects a source changed after review even if messages stay the same",async()=>{
  const input=await setup(),plan=await buildBoundedHistoricalPlan(input);
  await fs.appendFile(input.files[0],"\n");
  await expect(verifyBoundedHistoricalPlan({...input,plan})).rejects.toThrow("sources_changed");
 });
 it("rejects missing, duplicate and unbounded selection",async()=>{
  const input=await setup();
  await expect(buildBoundedHistoricalPlan({...input,selection:[{sourceThreadId:"thread",sourceMessageId:"absent"}]})).rejects.toThrow("message_missing");
  await expect(buildBoundedHistoricalPlan({...input,selection:[...selection,...selection]})).rejects.toThrow("duplicate_import_selection");
  await expect(buildBoundedHistoricalPlan({...input,selection:[]})).rejects.toThrow("1_to_20");
  await expect(buildBoundedHistoricalPlan({...input,selection:Array(21).fill(selection[0])})).rejects.toThrow("1_to_20");
 });
});
