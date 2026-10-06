import {afterEach,describe,expect,it} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {prepareResumableArchive,verifyResumableArchive,transportResumableArchive,readArchiveCheckpoint,saveArchiveCheckpoint,type ArchiveCheckpoint,type VerifiedArchiveTransport} from "../../../scripts/import_chatgpt/resumableArchive";
const target={userId:"11111111-1111-4111-8111-111111111111",projectId:"22222222-2222-4222-8222-222222222222"};
const dirs:string[]=[];
function conversation(id="thread",text="one",message="m"){return{id,current_node:message,mapping:{[message]:{parent:null,message:{id:message,author:{role:"user"},create_time:1,content:{parts:[text]}}}}};}
async function file(data:unknown,name="export.json"){const dir=await fs.mkdtemp(path.join(os.tmpdir(),"arbor-resume-"));dirs.push(dir);const file=path.join(dir,name);await fs.writeFile(file,JSON.stringify(data));return file;}
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>fs.rm(d,{recursive:true,force:true})));});
function destination(){const rows=new Map<string,string>();const key=(t:any)=>JSON.stringify([t.source,t.sourceThreadId,t.sourceMessageId]);let writes=0;
 const transport:VerifiedArchiveTransport={async applyExactBatch(scope,turns){expect(scope).toEqual(target);for(const t of turns)if(rows.has(key(t))&&rows.get(key(t))!==JSON.stringify(t))throw Error("destination_conflict");for(const t of turns)if(!rows.has(key(t))){rows.set(key(t),JSON.stringify(t));writes++;}},async verifyExactBatch(scope,turns){expect(scope).toEqual(target);for(const t of turns)if(rows.get(key(t))!==JSON.stringify(t))throw Error("destination_not_exact");}};
 return{rows,transport,get writes(){return writes;}};}
describe("resumable archive transport preparation",()=>{
 it("persists a private atomic checkpoint and fails on corrupt state",async()=>{const location=await file(null);await fs.rm(location);expect(await readArchiveCheckpoint(location)).toBeNull();const checkpoint={schemaVersion:1 as const,fingerprint:"bound-source",nextBatch:1};await saveArchiveCheckpoint(location,checkpoint);expect(await readArchiveCheckpoint(location)).toEqual(checkpoint);expect((await fs.stat(location)).mode&0o777).toBe(0o600);await fs.writeFile(location,"broken");await expect(readArchiveCheckpoint(location)).rejects.toThrow();});
 it("covers all normalized turns once while preserving original positions and long text",async()=>{
  const c=conversation("thread","x".repeat(3000));c.mapping.m.parent="a" as any;(c.mapping as any).a={parent:null,message:{id:"earlier",author:{role:"assistant"},create_time:1,content:{parts:["first"]}}};
  const files=[await file([c]),await file([c],"copy.json")];const p=await prepareResumableArchive({files,target,maxBytes:1000});expect(p.manifest.uniqueTurns).toBe(2);expect(p.manifest.duplicateTurns).toBe(2);expect(p.turns.map(t=>t.sourceMessageIndex)).toEqual([0,1]);expect(p.turns[1].content.length).toBe(3000);expect(p.manifest.batches[1].oversizedSingleMessage).toBe(true);expect(p.manifest.batches.map(b=>b.count).reduce((a,b)=>a+b,0)).toBe(2);
 });
 it("rejects conflicts, cross-thread message collisions and ambiguous source names",async()=>{
  await expect(prepareResumableArchive({files:[await file([conversation()]),await file([conversation("thread","changed")],"b.json")],target})).rejects.toThrow("preflight_failed");
  await expect(prepareResumableArchive({files:[await file([conversation(),conversation("other")])],target})).rejects.toThrow("cross_thread_message_collision");
  await expect(prepareResumableArchive({files:[await file([]),await file([])],target})).rejects.toThrow("ambiguous");
 });
 it("binds sources, payload, options and target instead of trusting a resume offset",async()=>{
  const files=[await file([conversation()])],p=await prepareResumableArchive({files,target});
  await expect(verifyResumableArchive({files,target:{...target,projectId:target.userId},manifest:p.manifest})).rejects.toThrow("target_mismatch");
  await expect(verifyResumableArchive({files,target,manifest:{...p.manifest,uniqueTurns:7}})).rejects.toThrow("manifest_changed");
  await fs.writeFile(files[0],JSON.stringify([conversation("thread","changed")]));await expect(verifyResumableArchive({files,target,manifest:p.manifest})).rejects.toThrow("sources_or_parser_changed");
 });
 it("recovers after destination commit but failed checkpoint save without duplicates",async()=>{
  const files=[await file([conversation("a","one","a"),conversation("b","two","b")])],p=await prepareResumableArchive({files,target,maxMessages:1}),d=destination();let checkpoint:ArchiveCheckpoint|null=null;
  const base={files,target,manifest:p.manifest,transport:d.transport};
  await expect(transportResumableArchive({...base,checkpoint,saveCheckpoint:async()=>{throw Error("disk_failed");}})).rejects.toThrow("disk_failed");expect(d.writes).toBe(1);
  const saveCheckpoint=async(v:ArchiveCheckpoint)=>{checkpoint=v;};await transportResumableArchive({...base,checkpoint,saveCheckpoint});expect(d.writes).toBe(1);
  const result=await transportResumableArchive({...base,checkpoint,saveCheckpoint});expect(result).toMatchObject({transportComplete:true,readingComplete:false,modelCalls:false});expect(d.writes).toBe(2);
 });
 it("does not advance after a failed write or readback and refuses forged completed coverage",async()=>{
  const files=[await file([conversation()])],p=await prepareResumableArchive({files,target}),d=destination();let saves=0;const saveCheckpoint=async()=>{saves++;};
  await expect(transportResumableArchive({files,target,manifest:p.manifest,checkpoint:null,saveCheckpoint,transport:{...d.transport,applyExactBatch:async()=>{throw Error("offline");}}})).rejects.toThrow("offline");
  await expect(transportResumableArchive({files,target,manifest:p.manifest,checkpoint:null,saveCheckpoint,transport:{...d.transport,verifyExactBatch:async()=>{throw Error("readback_failed");}}})).rejects.toThrow("readback_failed");expect(saves).toBe(0);
  const empty=destination();await expect(transportResumableArchive({files,target,manifest:p.manifest,checkpoint:{schemaVersion:1,fingerprint:p.manifest.fingerprint,nextBatch:1},saveCheckpoint,transport:empty.transport})).rejects.toThrow("destination_not_exact");
 });
 it("honors STOP without advancing the durable checkpoint",async()=>{
  const files=[await file([conversation("a","one","a"),conversation("b","two","b")])],p=await prepareResumableArchive({files,target,maxMessages:1}),d=destination(),controller=new AbortController();let checkpoint:ArchiveCheckpoint|null=null;
  const transport:VerifiedArchiveTransport={...d.transport,async applyExactBatch(scope,turns){await d.transport.applyExactBatch(scope,turns);controller.abort();}};
  await expect(transportResumableArchive({files,target,manifest:p.manifest,checkpoint,transport,signal:controller.signal,saveCheckpoint:async(v)=>{checkpoint=v;}})).rejects.toThrow("archive_transport_aborted");
  expect(checkpoint).toBeNull();expect(d.writes).toBe(1);
  const saveCheckpoint=async(v:ArchiveCheckpoint)=>{checkpoint=v;};await transportResumableArchive({files,target,manifest:p.manifest,checkpoint,transport:d.transport,saveCheckpoint});
  expect(checkpoint?.nextBatch).toBe(1);expect(d.writes).toBe(1);
 });
 it("does not overwrite a conflicting destination or resume a different manifest",async()=>{
  const files=[await file([conversation()])],p=await prepareResumableArchive({files,target}),d=destination();d.rows.set(JSON.stringify(["chatgpt","thread","m"]),"conflicting original");
  const base={files,target,manifest:p.manifest,transport:d.transport,saveCheckpoint:async()=>{}};
  await expect(transportResumableArchive({...base,checkpoint:null})).rejects.toThrow("destination_conflict");expect([...d.rows.values()]).toEqual(["conflicting original"]);
  await expect(transportResumableArchive({...base,checkpoint:{schemaVersion:1,fingerprint:"different",nextBatch:0}})).rejects.toThrow("checkpoint_mismatch");
 });
});
