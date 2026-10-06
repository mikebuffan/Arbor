import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { writeDurableBehaviorCorrection } from "../durableCorrectionWrite";
import { recoverPendingBehaviorCorrections } from "@/lib/arbor/runtime/correctionRecovery";

describe("installed Supabase request contracts for correction writes", () => {
  it("sends the complete database acceptance predicate and requires returned mutation rows", async () => {
    const existing = { id:"row",user_id:"owner",project_id:null,conversation_id:null,
      key:"behavior.correction.agency-followthrough",scope:"global",status:"active",deleted_at:null,
      locked:false,value:{text:"Keep going",last_observed_at:"2026-10-02T10:00:00Z"} };
    const calls:{url:URL;method:string}[]=[];
    const supabase=createClient("https://example.invalid","test-placeholder",{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:async(input,init)=>{
        const url=new URL(String(input));const method=init?.method ?? "GET";calls.push({url,method});
        return new Response(JSON.stringify(method==="GET"?[existing]:[{id:"row"}]),{
          status:200,headers:{"content-type":"application/json"},
        });
      }},
    });
    expect(await writeDurableBehaviorCorrection({supabase,userId:"owner",now:"2026-10-02T12:00:00Z",embedding:[0],
      item:{key:existing.key,value:{text:"Keep going with the newer rule",family:"agency-followthrough",
        last_observed_at:"2026-10-02T11:00:00Z"},scope:"global",tier:"core",memory_kind:"correction",
        confidence:1,importance:10,user_trigger_only:false},
    })).toBe("updated");
    const write=calls.find(c=>c.method==="PATCH")!.url.searchParams;
    expect(write.get("value")).toBe("eq."+JSON.stringify(existing.value));
    expect(write.get("user_id")).toBe("eq.owner");
    expect(write.get("scope")).toBe("eq.global");
    expect(write.get("project_id")).toBe("is.null");
    expect(write.get("conversation_id")).toBe("is.null");
    expect(write.get("status")).toBe("eq.active");
    expect(write.get("deleted_at")).toBe("is.null");
    expect(write.get("locked")).toBe("eq.false");
    expect(write.get("select")).toBe("id");
  });
  it("encodes fair bounded ledger selection without any live request", async () => {
    let selected:URL|undefined;
    const supabase=createClient("https://example.invalid","test-placeholder",{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:async(input)=>{
        selected=new URL(String(input));return new Response("[]",{status:200,headers:{"content-type":"application/json"}});
      }},
    });
    expect(await recoverPendingBehaviorCorrections({supabase,userId:"owner"})).toEqual({completed:0,failed:0,deferred:false});
    expect(selected!.searchParams.get("order")).toBe("ops->>lastAttemptAt.asc.nullsfirst,created_at.asc,id.asc");
    expect(selected!.searchParams.get("limit")).toBe("21");
    expect(selected!.searchParams.get("user_id")).toBe("eq.owner");
    expect(selected!.searchParams.get("event_type")).toBe("eq.behavior_correction_promotion_pending");
  });
});
