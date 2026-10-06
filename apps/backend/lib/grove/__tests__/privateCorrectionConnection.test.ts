import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks=vi.hoisted(()=>({authorize:vi.fn()}));
vi.mock("../privateReadBroker",()=>({authorizePrivateGroveConversation:mocks.authorize}));
vi.mock("@/lib/memory/embeddings",()=>({embedTexts:async(texts:string[])=>texts.map(()=>[0]),embedText:async()=>[0],memoryToEmbedString:(key:string)=>key}));
vi.mock("@/lib/memory/logger",()=>({logMemoryEvent:async()=>{}}));
vi.mock("@/lib/supabase/server",()=>({getServerSupabase:vi.fn()}));
import { savePrivateGroveCorrection } from "../privateCorrectionWrite";
import { BehaviorCorrectionDatabase } from "@/lib/__tests__/behaviorCorrectionDatabase";
import { stageBehaviorCorrectionPromotion } from "@/lib/arbor/runtime/correctionRecovery";
import { createCorrection } from "@/lib/arbor/runtime/corrections";
const ids=[1,2,3,4,5].map(n=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0"));
const [groveUserId,fireflyUserId,projectId,conversationId,requestId]=ids;
const input={request:new Request("https://grove.example.org/api/grove/corrections"),projectId,conversationId,requestId,text:"Remember this: keep going"};
let db:BehaviorCorrectionDatabase,revoked:boolean;
beforeEach(()=>{
  vi.stubEnv("GROVE_PRIVATE_CORRECTION_WRITE_ENABLED","true");db=new BehaviorCorrectionDatabase();revoked=false;
  const q:any={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({error:null,data:revoked?null:{
    grove_user_id:groveUserId,firefly_user_id:fireflyUserId,firefly_project_id:projectId,firefly_conversation_id:conversationId,
    purpose:"global_behavior_calibration",expires_at:new Date(Date.now()+60000).toISOString(),revoked_at:null}})};
  mocks.authorize.mockImplementation(async()=>({groveUserId,fireflyUserId,projectId,conversationId,access:"read-only",
    fireflyAdmin:db as unknown as SupabaseClient,groveAdmin:{from:()=>q}}));
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("Grove connection through the existing durable writer",()=>{
  it("stages, recovers and verifies a permanent correction without sweeping other UUIDs",async()=>{
    await stageBehaviorCorrectionPromotion({supabase:db as unknown as SupabaseClient,userId:fireflyUserId,projectId,conversationId,
      userMessageId:groveUserId,currentUserText:input.text,corrections:[createCorrection({value:input.text,kind:"behavior",source:"text",observedAt:new Date().toISOString()})]});
    expect(await savePrivateGroveCorrection(input)).toEqual({status:"saved",permanent:true});
    expect(db.tables.memory_items).toHaveLength(1);
    expect(db.tables.memory_pending.find(r=>r.id===groveUserId)?.event_type).toContain("_pending");
  });
  it("recovers a lost response using the same UUID and original timestamp",async()=>{
    expect((await savePrivateGroveCorrection(input)).permanent).toBe(true);
    const timestamp=db.tables.memory_items[0].value.last_observed_at;
    expect(await savePrivateGroveCorrection(input)).toEqual({status:"saved",permanent:true});
    expect(db.tables.memory_items).toHaveLength(1);
    expect(db.tables.memory_pending.filter(r=>r.ops?.kind==="behavior_correction_promotion")).toHaveLength(1);
    expect(db.tables.memory_items[0].value.last_observed_at).toBe(timestamp);
  });
  it("rejects changed correction text on the same UUID",async()=>{
    await savePrivateGroveCorrection(input);
    await expect(savePrivateGroveCorrection({...input,text:"Remember this: don't wait"})).rejects.toThrow("turn_mismatch");
    expect(db.tables.memory_items[0].value.text).toBe(input.text);
  });
  it("keeps exhausted permanent-write failure staged, then recovers",async()=>{
    vi.spyOn(console,"warn").mockImplementation(()=>{});
    db.fault=(table,mode)=>table==="memory_items"&&mode==="insert"?{code:"42501"}:null;
    expect(await savePrivateGroveCorrection(input)).toEqual({status:"staged",permanent:false});
    db.fault=undefined;expect((await savePrivateGroveCorrection(input)).permanent).toBe(true);
  });
  it("refuses revocation immediately before staging",async()=>{
    mocks.authorize.mockImplementationOnce(async()=>{revoked=true;return {groveUserId,fireflyUserId,projectId,conversationId,
      fireflyAdmin:db,groveAdmin:{from:()=>{const q:any={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({data:null,error:null})};return q;}}};});
    await expect(savePrivateGroveCorrection(input)).rejects.toThrow("not_granted");expect(db.tables.memory_pending).toEqual([]);
  });
  it("does not permanently save ordinary feedback or acoustic calibration",async()=>{
    for(const text of ["You're too formal","Remember this: your accent sounds British"])
      expect(await savePrivateGroveCorrection({...input,text})).toEqual({status:"not_requested",permanent:false});
    expect(db.tables.memory_pending).toEqual([]);
  });
});
