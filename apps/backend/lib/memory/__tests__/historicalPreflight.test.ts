import {afterEach,describe,expect,it} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {preflightHistoricalSources} from "../../../scripts/import_chatgpt/preflight";
const dirs:string[]=[];
async function file(value:unknown){const dir=await fs.mkdtemp(path.join(os.tmpdir(),"arbor-preflight-"));dirs.push(dir);
 const name=path.join(dir,"export.json");await fs.writeFile(name,JSON.stringify(value));return name;}
const conversation=(text="remembered text")=>({id:"thread",current_node:"m",mapping:{m:{parent:null,children:[],
 message:{id:"message",author:{role:"user"},create_time:1,content:{content_type:"text",parts:[text]}}}}});
afterEach(async()=>{await Promise.all(dirs.splice(0).map(dir=>fs.rm(dir,{recursive:true,force:true})));});
describe("write-free historical preflight",()=>{
 it("distinguishes an empty placeholder from a missing conversation branch",async()=>{
  const result=await preflightHistoricalSources([await file([{},conversation()])]);
  expect(result).toMatchObject({ready:true,uniqueTurns:1,writes:false,modelCalls:false});
  expect(result.files[0]).toMatchObject({emptyEntries:1,conversationsWithText:1,problems:[]});
  const broken={...conversation(),current_node:"missing"};
  expect((await preflightHistoricalSources([await file([broken])])).ready).toBe(false);
 });
 it("rejects conflicting message identities and reports exact duplicates",async()=>{
  const a=await file([conversation()]);const b=await file([conversation()]);
  expect(await preflightHistoricalSources([a,b])).toMatchObject({ready:true,uniqueTurns:1,duplicateTurns:1});
  expect(await preflightHistoricalSources([a,await file([conversation("changed")])])).toMatchObject({ready:false,conflictingTurns:1});
 });
 it("rejects broken parent links and cycles before parsing",async()=>{
  const broken=conversation();broken.mapping.m.parent="missing" as any;
  expect((await preflightHistoricalSources([await file([broken])])).files[0].problems[0].code).toBe("missing_parent");
  broken.mapping.m.parent="m" as any;
  expect((await preflightHistoricalSources([await file([broken])])).files[0].problems[0].code).toBe("cyclic_branch");
 });
 it("rejects malformed input rather than reporting partial success",async()=>{
  const name=await file([]);await fs.writeFile(name,'[{"id":"unfinished"');
  await expect(preflightHistoricalSources([name])).rejects.toThrow();
 });
 it("reports structured descriptors without claiming media was read",async()=>{
  const c=conversation();c.mapping.m.message.content.parts=[{asset_pointer:"image"}] as any;
  const result=await preflightHistoricalSources([await file([c])]);
  expect(result).toMatchObject({ready:true,uniqueTurns:1,writes:false,modelCalls:false});
  expect(result.files[0].messagesWithStructuredParts).toBe(1);
  expect(result.scope).toContain("media bytes and alternative branches are not read");
 });
 it("rejects malformed parents and inherited mapping keys",async()=>{
  const c=conversation();c.mapping.m.parent=1 as any;
  expect((await preflightHistoricalSources([await file([c])])).files[0].problems[0].code).toBe("invalid_parent");
  c.current_node="toString";
  expect((await preflightHistoricalSources([await file([c])])).files[0].problems[0].code).toBe("missing_active_branch");
 });
});
