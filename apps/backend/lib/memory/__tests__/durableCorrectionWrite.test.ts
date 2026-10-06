import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { writeDurableBehaviorCorrection } from "../durableCorrectionWrite";
import { correctionPromotionItem } from "@/lib/arbor/runtime/correctionPromotion";
import { createCorrection } from "@/lib/arbor/runtime/corrections";
import { BehaviorCorrectionDatabase } from "@/lib/__tests__/behaviorCorrectionDatabase";

const userId = "owner", key = "behavior.correction.agency-followthrough";
const item = (hour: string, text = "Keep going") => correctionPromotionItem(createCorrection({
  kind: "behavior", value: text, source: "text", observedAt: "2026-10-02T" + hour + ":00:00Z",
}), true)!;
const row = () => ({ id: "existing", user_id: userId, key, scope: "global",
  project_id: null, conversation_id: null, status: "active", deleted_at: null, locked: false,
  value: item("10").value });
const write = (db: BehaviorCorrectionDatabase, hour: string, text?: string) => writeDurableBehaviorCorrection({
  supabase: db as unknown as SupabaseClient, userId, item: item(hour,text), embedding: [0], now: "2026-10-02T13:00:00Z",
});

describe("atomic durable behavior correction writes", () => {
  it("keeps the newer rule when both writers read the older value", async () => {
    const db = new BehaviorCorrectionDatabase(); db.tables.memory_items = [row()];
    let reads = 0, release!: () => void, newerWritten!: () => void;
    const barrier = new Promise<void>(r => release=r), written = new Promise<void>(r => newerWritten=r);
    db.readHook = async () => { if (++reads <= 2) { if(reads===2)release(); await barrier; } };
    db.writeHook = async (_, value) => { if(value.value.last_observed_at.includes("T11:")) await written; };
    db.afterWrite = (_,value) => { if(value.value.last_observed_at.includes("T12:")) newerWritten(); };
    expect(await Promise.all([write(db,"11","Keep going with the old rule"),write(db,"12","Keep going with the new rule")]))
      .toEqual(["ignored","updated"]);
    expect(db.tables.memory_items[0].value.text).toBe("Keep going with the new rule");
  });
  it("arbitrates concurrent first inserts using the existing uniqueness contract", async () => {
    const db = new BehaviorCorrectionDatabase(); let reads=0,release!:()=>void;
    const barrier = new Promise<void>(r => release=r);
    db.readHook=async()=>{if(++reads<=2){if(reads===2)release();await barrier;}};
    await Promise.all([write(db,"11"),write(db,"12")]);
    expect(db.tables.memory_items).toHaveLength(1);
    expect(db.tables.memory_items[0].value.last_observed_at).toContain("T12:");
  });
  it("preserves the accepted rule for equal or older observations", async () => {
    const db = new BehaviorCorrectionDatabase(); db.tables.memory_items=[row()];
    expect(await write(db,"10","Keep going with a conflicting tie")).toBe("ignored");
    expect(await write(db,"09")).toBe("ignored");
    expect(db.calls.filter(c=>c.mode==="update")).toHaveLength(0);
  });
  it("does not revive a tombstone, including deletion during a concurrent write", async () => {
    const db = new BehaviorCorrectionDatabase(); db.tables.memory_items=[row()];
    db.writeHook=async()=>{db.tables.memory_items[0].status="tombstoned";db.tables.memory_items[0].deleted_at="now";};
    expect(await write(db,"12")).toBe("ignored");
    expect(db.tables.memory_items[0].status).toBe("tombstoned");
    expect(db.tables.memory_items[0].value.last_observed_at).toContain("T10:");
  });
  it("leaves locked rules intact", async () => {
    const db=new BehaviorCorrectionDatabase();db.tables.memory_items=[{...row(),locked:true}];
    expect(await write(db,"12")).toBe("locked");
  });
  it.each([{user_id:"foreign"},{project_id:"foreign"},{scope:"project"},{conversation_id:"foreign"}])
    ("rejects a returned row outside global owner scope: %j",async patch=>{
      const db=new BehaviorCorrectionDatabase();db.tables.memory_items=[row()];
      db.returnedRow=(_,r)=>({...r,...patch});
      await expect(write(db,"12")).rejects.toThrow("scope_mismatch");
      expect(db.calls.some(c=>c.mode==="update")).toBe(false);
    });
  it("rejects zero-row writes rather than reporting success",async()=>{
    const db=new BehaviorCorrectionDatabase();db.tables.memory_items=[row()];
    let nonce = 0;
    db.writeHook=async()=>{db.tables.memory_items[0].value={...(item("10").value as Record<string, unknown>),nonce:++nonce};};
    await expect(write(db,"12")).rejects.toThrow("contention");
    expect(db.calls.filter(c=>c.mode==="update")).toHaveLength(3);
  });
  it("propagates permission failure without a write retry",async()=>{
    const db=new BehaviorCorrectionDatabase();db.tables.memory_items=[row()];
    db.fault=(_,mode)=>mode==="update"?{code:"42501"}:null;
    await expect(write(db,"12")).rejects.toEqual({code:"42501"});
    expect(db.calls.filter(c=>c.mode==="update")).toHaveLength(1);
  });
});
