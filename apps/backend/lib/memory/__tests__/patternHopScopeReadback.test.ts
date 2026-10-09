import { describe, expect, it, vi } from "vitest";
import { searchMemoryHopEvidence, searchTimelineHopEvidence } from "../patternHopRetrieval";

const userId="synthetic-owner",projectId="synthetic-project";
function db(input: {memory?: unknown; timeline?: unknown}) {
  const queries: Array<{table:string;filters:Array<[string,unknown]>}> = [];
  const from=vi.fn((table:string) => {
    const filters: Array<[string,unknown]> = [];
    const q:any={};
    q.select=q.is=q.neq=q.or=q.order=()=>q;
    q.eq=(k:string,v:unknown)=>{filters.push([k,v]);return q;};
    q.limit=async()=>{
      queries.push({table,filters});
      return {data:table==="memory_items"?input.memory:input.timeline,error:null};
    };
    return q;
  });
  return {supabase:{from} as never,queries};
}
const memory=(id:string,overrides:Record<string,unknown>={})=>({
  id,user_id:userId,project_id:projectId,conversation_id:null,
  scope:"project",key:"checkpoint",value:"repair",tier:"normal",
  confidence:.8,memory_kind:"fact",status:"active",deleted_at:null,
  user_trigger_only:false,excluded_from_memory:false,updated_at:"2026-10-08",created_at:"2026-10-07",
  ...overrides
});
const event=(id:string,overrides:Record<string,unknown>={})=>({
  id,user_id:userId,project_id:projectId,conversation_id:"synthetic-thread",
  turn_id:"synthetic-turn",sequence:1,phase:"checkpoint",event_type:"repair",
  subsystem:"arbor",channel:"text",action_id:null,payload:{note:"repair"},
  created_at:"2026-10-08",...overrides
});
const opts={userId,projectId,clue:"checkpoint repair"};

describe("Pattern Hop source-read scope and reveal boundary",()=>{
  it("admits only eligible, scoped ordinary memories and true conversation-free global records",async()=>{
    const x=db({memory:[
      memory("own"),
      memory("global",{scope:"global",project_id:"another-project"}),
      memory("wrong-owner",{user_id:"foreign",value:"SECRET-OWNER"}),
      memory("wrong-project",{project_id:"foreign",value:"SECRET-PROJECT"}),
      memory("retired",{status:"retired",value:"SECRET-RETIRED"}),
      memory("deleted",{deleted_at:"2026-10-07",value:"SECRET-DELETED"}),
      memory("excluded",{excluded_from_memory:true,value:"SECRET-EXCLUDED"}),
      memory("triggered",{user_trigger_only:true,value:"SECRET-TRIGGER"}),
      memory("sensitive",{tier:"sensitive",value:"SECRET-SENSITIVE"}),
      memory("conversation-global",{scope:"global",conversation_id:"foreign-thread",value:"SECRET-CONVERSATION"}),
      memory("unknown-scope",{scope:"conversation",value:"SECRET-SCOPE"}),
    ]});
    const evidence=await searchMemoryHopEvidence({...opts,supabase:x.supabase});
    expect(evidence.map(x=>x.id)).toEqual(["memory:own","memory:global"]);
    expect(JSON.stringify(evidence)).not.toContain("SECRET");
    expect(x.queries[0].filters).toContainEqual(["user_id",userId]);
  });

  it("ignores wrong-owner and foreign-project timeline events from a misrouted readback",async()=>{
    const x=db({timeline:[
      event("own"),
      event("other-owner",{user_id:"foreign",payload:{note:"SECRET-OWNER"}}),
      event("other-project",{project_id:"foreign",payload:{note:"SECRET-PROJECT"}}),
      {id:"missing-owner",phase:"checkpoint",event_type:"SECRET"},
    ]});
    const evidence=await searchTimelineHopEvidence({...opts,supabase:x.supabase});
    expect(evidence.map(x=>x.id)).toEqual(["timeline:own"]);
    expect(JSON.stringify(evidence)).not.toContain("SECRET");
    expect(x.queries[0].filters).toContainEqual(["project_id",projectId]);
  });

  it("fails closed on malformed memory/timeline collections",async()=>{
    const m=db({memory:{bad:true},timeline:null});
    expect(await searchMemoryHopEvidence({...opts,supabase:m.supabase})).toEqual([]);
    expect(await searchTimelineHopEvidence({...opts,supabase:m.supabase})).toEqual([]);
  });
});
