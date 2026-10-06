import fs from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/memory/embeddings", () => ({
  embedTexts: async (texts: string[]) => texts.map(() => [0]),
  embedText: async () => [0], memoryToEmbedString: (key: string) => key,
}));
vi.mock("@/lib/memory/logger", () => ({ logMemoryEvent: async () => {} }));
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: vi.fn() }));
import { stageBehaviorCorrectionPromotion, recoverPendingBehaviorCorrections, schedulePendingBehaviorCorrectionRecovery } from "../correctionRecovery";
import { createCorrection } from "../corrections";
import { BehaviorCorrectionDatabase } from "@/lib/__tests__/behaviorCorrectionDatabase";

const userId="owner", projectId="project", conversationId="conversation", userMessageId="message";
const correction=(hour="12")=>createCorrection({
  kind:"behavior",value:"Always keep going; remember this.",source:"text",observedAt:"2026-10-02T"+hour+":00:00Z",
});
const client=(db:BehaviorCorrectionDatabase)=>db as unknown as SupabaseClient;
const stage=(db:BehaviorCorrectionDatabase,hour="12",text="Always keep going; remember this.")=>stageBehaviorCorrectionPromotion({
  supabase:client(db),userId,projectId,conversationId,userMessageId,currentUserText:text,corrections:[correction(hour)],
});
const recover=(db:BehaviorCorrectionDatabase)=>recoverPendingBehaviorCorrections({supabase:client(db),userId,pause:async()=>{}});
beforeEach(()=>vi.restoreAllMocks());

describe("durable correction recovery on authenticated chat",()=>{
 it("ordinary chat recovery cannot promote a Grove job without fresh bounded authorization",async()=>{
  const db=new BehaviorCorrectionDatabase();await stageBehaviorCorrectionPromotion({supabase:client(db),userId,projectId,conversationId,
    userMessageId,currentUserText:correction().value,corrections:[correction()],
    writeAuthorization:{kind:"grove_global_behavior_calibration",groveUserId:"grove-owner"}});
  vi.spyOn(console,"warn").mockImplementation(()=>{});
  expect((await recover(db)).failed).toBe(1);expect(db.tables.memory_items).toEqual([]);
  expect((await recoverPendingBehaviorCorrections({supabase:client(db),userId,requestId:userMessageId,
    authorizePromotion:async()=>{},pause:async()=>{}})).completed).toBe(1);
 });
 it("recovers only the requested UUID and rechecks authority before promotion and acknowledgement",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);
  await stageBehaviorCorrectionPromotion({supabase:client(db),userId,projectId,conversationId,
    userMessageId:"other",currentUserText:correction().value,corrections:[correction()]});
  const authorizePromotion=vi.fn(async()=>{});
  expect(await recoverPendingBehaviorCorrections({supabase:client(db),userId,requestId:userMessageId,authorizePromotion,pause:async()=>{}}))
    .toEqual({completed:1,failed:0,deferred:false});
  expect(authorizePromotion).toHaveBeenCalledTimes(2);
  expect(authorizePromotion).toHaveBeenCalledWith({projectId,conversationId});
  expect(db.tables.memory_pending.find(r=>r.id==="other")?.event_type).toContain("_pending");
 });
 it("holds a pending save when the bounded write permission is revoked before recovery",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);vi.spyOn(console,"warn").mockImplementation(()=>{});
  expect((await recoverPendingBehaviorCorrections({supabase:client(db),userId,requestId:userMessageId,
    authorizePromotion:async()=>{throw new Error("permission_revoked");},pause:async()=>{}})).failed).toBe(1);
  expect(db.tables.memory_items).toEqual([]);
 });
 it("does not stage unrequested or acoustic promotion",async()=>{
  const db=new BehaviorCorrectionDatabase();
  await stage(db,"12","Keep going");
  await stageBehaviorCorrectionPromotion({supabase:client(db),userId,projectId,conversationId,userMessageId,
   currentUserText:"Always remember this accent",corrections:[{...correction(),kind:"acoustic"}]});
  expect(db.tables.memory_pending).toEqual([]);
 });
 it("stages explicit authorization before any permanent write and preserves the timestamp on request retry",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db,"11");
  expect(db.tables.memory_items).toEqual([]);
  expect((await stage(db,"12"))[0].observedAt).toContain("T11:");
  expect(db.tables.memory_pending).toHaveLength(1);
 });
 it("replays a serialized pending save in a fresh session without a repeated rule",async()=>{
  const original=new BehaviorCorrectionDatabase();await stage(original);
  const fresh=new BehaviorCorrectionDatabase();fresh.tables=JSON.parse(JSON.stringify(original.tables));
  expect(await recover(fresh)).toEqual({completed:1,failed:0,deferred:false});
  expect(fresh.tables.memory_items[0].value.text).toBe(correction().value);
  expect(fresh.tables.memory_pending[0].event_type).toBe("behavior_correction_promotion_complete");
  const writes=fresh.calls.filter(c=>c.table==="memory_items"&&c.mode==="insert").length;
  expect(await recover(fresh)).toEqual({completed:0,failed:0,deferred:false});
  expect(fresh.calls.filter(c=>c.table==="memory_items"&&c.mode==="insert")).toHaveLength(writes);
 });
 it("retries a transient storage failure within the bounded continuation",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);let failures=1;
  db.fault=(table,mode)=>table==="memory_items"&&mode==="insert"&&failures-->0?{status:503}:null;
  expect((await recover(db)).completed).toBe(1);
  expect(db.calls.filter(c=>c.table==="memory_items"&&c.mode==="insert")).toHaveLength(2);
 });
 it("keeps an exhausted save pending and recovers it on a later request",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);
  const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
  db.fault=(table,mode)=>table==="memory_items"&&mode==="insert"?{status:503}:null;
  expect((await recover(db)).failed).toBe(1);
  expect(db.calls.filter(c=>c.table==="memory_items"&&c.mode==="insert")).toHaveLength(3);
  expect(db.tables.memory_pending[0].event_type).toContain("_pending");
  db.fault=undefined;expect((await recover(db)).completed).toBe(1);
  expect(warn.mock.calls.flat().join(" ")).not.toContain(correction().value);
 });
 it("recovers after a write succeeded but acknowledgement failed, without a duplicate permanent write",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);
  vi.spyOn(console,"warn").mockImplementation(()=>{});
  db.fault=(table,mode)=>table==="memory_pending"&&mode==="update"?{code:"42501"}:null;
  expect((await recover(db)).failed).toBe(1);
  expect(db.tables.memory_items).toHaveLength(1);
  db.fault=undefined;expect((await recover(db)).completed).toBe(1);
  expect(db.calls.filter(c=>c.table==="memory_items"&&["insert","update"].includes(c.mode))).toHaveLength(1);
 });
 it("requires permanent readback before acknowledging a reported write",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);
  vi.spyOn(console,"warn").mockImplementation(()=>{});
  db.returnedRow=(table,row)=>table==="memory_items"&&row.value?{...row,value:{...row.value,last_observed_at:"2026-10-02T10:00:00Z"}}:row;
  expect((await recover(db)).failed).toBe(1);
  expect(db.tables.memory_pending[0].event_type).toContain("_pending");
 });
 it.each([{user_id:"foreign"},{project_id:"foreign"},{payload:{explicitlyAuthorized:false,userId,corrections:[correction()]}}])
  ("rejects scope or authorization corruption without permanent writes: %j",async patch=>{
   const db=new BehaviorCorrectionDatabase();await stage(db);
   vi.spyOn(console,"warn").mockImplementation(()=>{});
   db.returnedRow=(table,row)=>table==="memory_pending"?{...row,...patch}:row;
   expect((await recover(db)).failed).toBe(1);
   expect(db.tables.memory_items).toEqual([]);
  });
 it("does not retry permission errors and leaves the job recoverable",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);vi.spyOn(console,"warn").mockImplementation(()=>{});
  db.fault=(table,mode)=>table==="memory_items"&&mode==="insert"?{code:"42501",message:"private token"}:null;
  expect((await recover(db)).failed).toBe(1);
  expect(db.calls.filter(c=>c.table==="memory_items"&&c.mode==="insert")).toHaveLength(1);
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private token");
 });
 it("cannot revive a revoked rule from a durable pending job",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);await recover(db);
  db.tables.memory_pending[0].event_type="behavior_correction_promotion_pending";
  db.tables.memory_items[0].status="tombstoned";db.tables.memory_items[0].deleted_at="2026-10-02T13:00:00Z";
  expect((await recover(db)).completed).toBe(1);
  expect(db.tables.memory_items[0].status).toBe("tombstoned");
 });
 it("limits work to 20 jobs and reports deferred work",async()=>{
  const db=new BehaviorCorrectionDatabase();
  for(let i=0;i<21;i++)await stageBehaviorCorrectionPromotion({supabase:client(db),userId,projectId,conversationId,
   userMessageId:"message-"+i,currentUserText:correction().value,corrections:[correction()]});
  expect(await recover(db)).toEqual({completed:20,failed:0,deferred:true});
  expect(db.tables.memory_pending.filter(r=>r.event_type.endsWith("_pending"))).toHaveLength(1);
 });
 it("uses the existing lifecycle scheduler for cached-response recovery",async()=>{
  const db=new BehaviorCorrectionDatabase();await stage(db);
  let continuation:(()=>Promise<void>)|undefined;
  schedulePendingBehaviorCorrectionRecovery({supabase:client(db),userId,registerContinuation:callback=>continuation=callback});
  expect(db.tables.memory_items).toEqual([]);await continuation!();
  expect(db.tables.memory_items).toHaveLength(1);
 });
 it("does not let a full window of corrupted jobs starve a later authorized save",async()=>{
  const db=new BehaviorCorrectionDatabase();vi.spyOn(console,"warn").mockImplementation(()=>{});
  for(let i=0;i<21;i++)await stageBehaviorCorrectionPromotion({supabase:client(db),userId,projectId,conversationId,
   userMessageId:"job-"+String(i).padStart(2,"0"),currentUserText:correction().value,corrections:[correction()]});
  for(const job of db.tables.memory_pending.slice(0,20))job.payload.explicitlyAuthorized=false;
  expect(await recover(db)).toEqual({completed:0,failed:20,deferred:true});
  expect((await recover(db)).completed).toBe(1);
  expect(db.tables.memory_items).toHaveLength(1);
 });
 it("stages before generation and wires recovery into both fresh and cached chat paths",()=>{
  const route=fs.readFileSync("app/api/chat/route.ts","utf8");
  expect(route.indexOf("await stageBehaviorCorrectionPromotion")).toBeLessThan(route.indexOf("await runOpenAIAgencyAgent"));
  expect(route).toContain("schedulePendingBehaviorCorrectionRecovery({ supabase, userId })");
  expect(route).toContain("await recoverPendingBehaviorCorrections({ supabase, userId })");
  expect(route).not.toContain("await promoteRepeatedBehaviorCorrections");
 });
});
