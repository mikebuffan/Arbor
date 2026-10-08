import {describe, expect, it, vi} from "vitest";
vi.mock("@/lib/providers/openai", () => ({openAIEmbed: vi.fn().mockResolvedValue([0.1])}));
import {getAlwaysIncludedMemoryAnchors, getMemoryContext} from "../retrieval";
import {selectItemsForPrompt} from "../selectForPrompt";
import {getProjectAnchors} from "../anchors";

const row=(id:string, excluded=false)=>({id,project_id:"project",scope:"project",key:id,
 value:{text:id},tier:"core" as const,pinned:true,locked:true,user_trigger_only:false,
 status:"active",deleted_at:null,excluded_from_memory:excluded});
function db(responses:any[],vector:any[]=[]){
 const queries:any[]=[];
 const from=vi.fn(()=>{
  const response=responses.shift();
  const q:any={then:(resolve:any)=>Promise.resolve(response).then(resolve)};
  for(const key of ["select","eq","is","or","order","limit","in","neq"])q[key]=vi.fn(()=>q);
  queries.push(q);return q;
 });
 return {client:{from,rpc:vi.fn().mockResolvedValue({data:vector,error:null})} as any,queries};
}
const scope={authedUserId:"owner",projectId:"project",conversationId:null,latestUserText:"what is remembered"};
describe("memory exclusion across retrieval routes",()=>{
 it("excludes pinned/locked/core rows from direct recall and anchors",async()=>{
  const rows=[row("allowed"),row("excluded",true)];
  const d=db([{data:rows,error:null},{data:rows,error:null}]);
  expect((await getMemoryContext({...scope,supabase:d.client})).keysUsed).toEqual(["allowed"]);
  expect((await getAlwaysIncludedMemoryAnchors({...scope,supabase:d.client})).map(i=>i.id)).toEqual(["allowed"]);
  for(const q of d.queries)expect(q.eq).toHaveBeenCalledWith("excluded_from_memory",false);
 });
 it("does not expose pinned sensitive or trigger-only claims as unconditional anchors",async()=>{
  const ordinary=row("ordinary");
  const trigger={...row("trigger"),tier:"normal" as const,user_trigger_only:true,value:{text:"secret trigger phrase"}};
  const sensitive={...row("sensitive"),tier:"sensitive" as const,value:{text:"private fact"}};
  const d=db([{data:[ordinary,trigger,sensitive],error:null},{data:[ordinary,trigger,sensitive],error:null}]);
  const anchors=await getAlwaysIncludedMemoryAnchors({...scope,supabase:d.client});
  expect(anchors.map(x=>x.id)).toEqual(["ordinary"]);
  expect(d.queries[0].eq).toHaveBeenCalledWith("user_trigger_only",false);
  expect(d.queries[0].neq).toHaveBeenCalledWith("tier","sensitive");
  // Explicitly triggered recall remains available behind the prompt selection gate.
  const recalled=await getMemoryContext({...scope,supabase:d.client});
  expect(recalled.keysUsed).toContain("trigger");
  expect(selectItemsForPrompt(recalled.sensitive,"unrelated question")).toEqual([]);
  expect(selectItemsForPrompt(recalled.sensitive,"secret trigger phrase").map(x=>x.id)).toContain("trigger");
 });
 it("project anchors reject forgotten, trigger-only, foreign, and conversation-mislabeled rows",async()=>{
  const good={id:"safe",user_id:"owner",project_id:"project",conversation_id:null,
    key:"pref.safe",value:{text:"approved"},scope:"project",tier:"core",
    pinned:true,locked:true,user_trigger_only:false,excluded_from_memory:false,
    status:"active",deleted_at:null,updated_at:"2026-10-07T00:00:00.000Z"};
  const rows=[
    good,
    {...good,id:"forgotten",excluded_from_memory:true,value:{text:"old excluded content"}},
    {...good,id:"trigger",user_trigger_only:true,value:{text:"hidden cue"}},
    {...good,id:"foreign",project_id:"elsewhere",value:{text:"foreign"}},
    {...good,id:"stray-thread",conversation_id:"thread-2",value:{text:"thread-only"}},
    {...good,id:"retired",status:"tombstoned",value:{text:"retired"}},
    {...good,id:"deleted",deleted_at:"2026-10-07T01:00:00.000Z",value:{text:"deleted"}},
    {...good,id:"other-user",user_id:"someone-else",value:{text:"other user"}},
  ];
  const d=db([{data:rows,error:null}]);
  const anchors=await getProjectAnchors({supabase:d.client,authedUserId:"owner",projectId:"project"});
  expect(anchors.map(x=>x.id)).toEqual(["safe"]);
  const query=d.queries[0];
  expect(query.eq).toHaveBeenCalledWith("excluded_from_memory",false);
  expect(query.eq).toHaveBeenCalledWith("user_trigger_only",false);
  expect(query.is).toHaveBeenCalledWith("conversation_id",null);
  expect(JSON.stringify(anchors)).not.toContain("hidden cue");
  expect(JSON.stringify(anchors)).not.toContain("old excluded content");
 });
 it("revalidates vector eligibility even when RPC results omit exclusion fields",async()=>{
  const legacy=[row("allowed"),row("excluded"),row("disappeared")];
  const d=db([{data:[row("allowed"),row("excluded",true)],error:null}],legacy);
  expect((await getMemoryContext({...scope,supabase:d.client,useVectorSearch:true})).keysUsed).toEqual(["allowed"]);
  expect(d.queries[0].eq).toHaveBeenCalledWith("user_id","owner");
 });
 it("uses scoped direct fallback if vector eligibility cannot be read",async()=>{
  const d=db([{data:null,error:{message:"unavailable"}},{data:[row("safe")],error:null}],[row("unsafe")]);
  const result=await getMemoryContext({...scope,supabase:d.client,useVectorSearch:true});
  expect(result.keysUsed).toEqual(["safe"]);
  expect(d.queries[1].eq).toHaveBeenCalledWith("excluded_from_memory",false);
 });
 it("uses current content and scope instead of a stale vector snapshot",async()=>{
  const d=db([{data:[{...row("changed"),value:{text:"current correction"}},
   {...row("moved"),project_id:"foreign"}],error:null}],[row("changed"),row("moved")]);
  const result=await getMemoryContext({...scope,supabase:d.client,useVectorSearch:true});
  expect(result.keysUsed).toEqual(["changed"]);
  expect(result.core[0].content_text).toBe("current correction");
 });
 it("rejects excluded content at prompt selection even with an exact trigger",()=>{
  const excluded={...row("excluded",true),content_text:"exclude this memory",importance:10};
  expect(selectItemsForPrompt([excluded],"exclude this memory")).toEqual([]);
 });
});
