import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeDurableBehaviorCorrection } from "./durableCorrectionWrite";

const KEY = "behavior.correction.agency-followthrough";
function item(text: string, observedAt: string) {
  return { key: KEY, value: { text, family: "agency-followthrough", last_observed_at: observedAt },
    scope: "global" as const, memory_kind: "correction" as const, confidence: 1, salience: 1 };
}

function concurrentClient() {
  let row: any = { id:"row", user_id:"u", key:KEY, scope:"global", project_id:null, conversation_id:null,
    value:{text:"old",family:"agency-followthrough",last_observed_at:"2026-10-07T10:00:00Z"},
    status:"active", deleted_at:null, locked:false, mention_count:0 };
  let firstCas = true;
  const client = { from() {
    const filters: Record<string, unknown> = {}; let patch: any = null;
    const q: any = {
      select(){ return q; }, eq(k:string,v:unknown){ filters[k]=v; return q; }, is(k:string,v:unknown){ filters[k]=v; return q; },
      update(v:any){ patch=v; return q; },
      async maybeSingle(){ return { data: row ? {...row} : null, error:null }; },
      async then(resolve:any){ return resolve({data:[],error:null}); },
    };
    q.select = () => {
      if (patch) return Promise.resolve().then(() => {
        if (firstCas) {
          firstCas = false;
          row = {...row, value:{text:"newest",family:"agency-followthrough",last_observed_at:"2026-10-07T10:02:00Z"}};
          return {data:[],error:null};
        }
        const matches = row && Object.entries(filters).every(([k,v]) => k === "value"
          ? JSON.stringify(row.value) === String(v) : row[k] === v);
        if (matches) { row={...row,...patch}; return {data:[{id:"row"}],error:null}; }
        return {data:[],error:null};
      });
      return q;
    };
    return q;
  }} as unknown as SupabaseClient;
  return { client, read:()=>row };
}

describe("durable behavior correction concurrency", () => {
  it("does not let an older correction overwrite a newer concurrent winner", async () => {
    const db = concurrentClient();
    const result = await writeDurableBehaviorCorrection({ supabase:db.client, userId:"u",
      item:item("middle","2026-10-07T10:01:00Z"), embedding:[], now:"2026-10-07T10:03:00Z" });
    expect(result).toBe("ignored");
    expect(db.read().value.text).toBe("newest");
  });
});
