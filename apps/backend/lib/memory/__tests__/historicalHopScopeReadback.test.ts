import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ embed: vi.fn() }));
vi.mock("@/lib/memory/embeddings", () => ({ embedText: mocks.embed }));
import { searchHistoricalHopEvidence } from "../patternHopRetrieval";

const owner="owner",project="project";
const canonical=(id:string, other:Record<string,unknown>={})=>({
  id,user_id:owner,project_id:project,source:"archive",
  source_thread_id:"thread",source_message_id:id,source_message_index:3,
  role:"user",content:"historical correction",occurred_at:"2026-10-08T12:00:00Z",
  ...other,
});
function db(opts:{
  rpc?:unknown; lexical?:unknown; verified?:unknown;
  verificationError?:boolean; lexicalError?:boolean;
}={}){
  const seen:Array<{verify:boolean;filters:Array<[string,unknown]>}>=[];
  const from=vi.fn(()=> {
    const filters:Array<[string,unknown]>=[];
    const q:any={};let verify=false;
    q.select=q.or=q.order=()=>q;
    q.eq=(name:string,value:unknown)=>{filters.push([name,value]);return q;};
    q.in=(_column:string,_ids:string[])=>{verify=true;return q;};
    q.limit=()=>q;
    q.then=(resolve:(value:unknown)=>void)=>{
      seen.push({verify,filters:[...filters]});
      return Promise.resolve({
        data: verify ? opts.verified ?? [] : opts.lexical ?? [],
        error: verify && opts.verificationError || !verify && opts.lexicalError
          ? { message:"SECRET-DRIVER",code:"failed" }:null,
      }).then(resolve);
    };
    return q;
  });
  const rpc=vi.fn(async()=>({data:opts.rpc??[],error:null}));
  return {supabase:{from,rpc} as never,from,rpc,seen};
}
const input={userId:owner,projectId:project,clue:"historical correction"};
beforeEach(()=>{vi.clearAllMocks();mocks.embed.mockResolvedValue([0.1]);});
describe("Group 3 Pattern Hop historic recall scope",()=>{
  it("revalidates semantic hits using canonical owned rows, not RPC text or claimed provenance",async()=>{
    const good=canonical("own");
    const x=db({rpc:[
      {...good, similarity:.88,content:"SECRET-RPC-TEXT",source:"forged"},
      {id:"foreign",similarity:.99,content:"SECRET-FOREIGN-RPC"},
    ],verified:[good,canonical("foreign",{user_id:"another-owner",content:"SECRET-FOREIGN-ROW"})]});
    const result=await searchHistoricalHopEvidence({...input,supabase:x.supabase});
    expect(result.map(v=>v.id)).toEqual(["own"]);
    expect(result[0]).toMatchObject({content:"historical correction",source:"archive",
      similarity:.88,retrievalMethod:"historical_embedding"});
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(x.seen[0].filters).toContainEqual(["user_id",owner]);
    expect(x.seen[0].filters).toContainEqual(["project_id",project]);
  });

  it("discards foreign and malformed lexical readbacks regardless of query filters",async()=>{
    mocks.embed.mockRejectedValueOnce(new Error("SECRET-EMBEDDING"));
    const x=db({lexical:[
      canonical("own"),
      canonical("foreign",{user_id:"other",content:"SECRET-OWNER"}),
      canonical("wrong-project",{project_id:"other",content:"SECRET-PROJECT"}),
      canonical("bad",{role:"nobody",content:"SECRET-ROLE"}),
      canonical("broken",{source_message_id:null,content:"SECRET-MISSING"}),
    ]});
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    try {
      const result=await searchHistoricalHopEvidence({...input,supabase:x.supabase});
      expect(result.map(v=>v.id)).toEqual(["own"]);
      expect(JSON.stringify(result)).not.toContain("SECRET");
      expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET");
      expect(x.seen[0].filters).toContainEqual(["project_id",project]);
    }finally{warn.mockRestore();}
  });

  it("keeps independently scoped lexical hits when semantic verification fails",async()=>{
    const x=db({rpc:[{id:"unverified",similarity:.99,content:"SECRET"}],
      verificationError:true,lexical:[canonical("lexical")]});
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    try{
      const result=await searchHistoricalHopEvidence({...input,supabase:x.supabase});
      expect(result.map(v=>v.id)).toEqual(["lexical"]);
      expect(JSON.stringify(result)).not.toContain("SECRET");
      expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET");
    }finally{warn.mockRestore();}
  });

  it("fails closed on malformed semantic and lexical row collections",async()=>{
    const x=db({rpc:{forged:true},lexical:{also:true}});
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    try{
      expect(await searchHistoricalHopEvidence({...input,supabase:x.supabase})).toEqual([]);
    }finally{warn.mockRestore();}
  });
});
