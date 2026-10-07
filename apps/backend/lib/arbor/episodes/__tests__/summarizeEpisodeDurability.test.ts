import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({chat:vi.fn()}));
vi.mock("@/lib/providers/openai",()=>({openAIChat:mocks.chat}));
import {summarizeEpisode} from "../summarizeEpisode";

class EpisodeDb{
 ep:any={id:"episode",user_id:"owner",project_id:"project",thread_id:"thread",status:"open",summary_json:null,
  opened_at:"2026-10-01T00:00:00Z",closed_at:null,created_at:"2026-10-01T00:00:00Z"};
 messages=[{role:"user",content:"Finish the continuity work",created_at:"2026-10-01T00:00:00Z"}];
 failSummary=false;
 from(table:string){
  const filters:Record<string,unknown>={};let patch:any=null;
  const matches=()=>Object.entries(filters).every(([k,v])=>this.ep[k]===v);
  const q:any={};
  q.select=()=>q;q.eq=(k:string,v:unknown)=>{filters[k]=v;return q;};q.is=(k:string,v:unknown)=>{filters[k]=v;return q;};
  q.order=()=>q;q.limit=()=>q;q.update=(value:any)=>{patch=value;return q;};
  q.single=async()=>table==="episodes"?{data:matches()?{...this.ep}:null,error:null}:{data:null,error:null};
  q.maybeSingle=async()=>{
   if(table!=="episodes")return{data:null,error:null};
   if(patch){
    if(this.failSummary&&patch.summary_json)return{data:null,error:new Error("durable_write_failed")};
    if(!matches())return{data:null,error:null};
    Object.assign(this.ep,patch);return{data:{status:this.ep.status,summary_json:this.ep.summary_json},error:null};
   }
   return{data:matches()?{status:this.ep.status,summary_json:this.ep.summary_json}:null,error:null};
  };
  q.then=(resolve:any)=>{
   if(table==="messages")return Promise.resolve({data:this.messages,error:null}).then(resolve);
   if(table==="episodes"&&patch){
    if(this.failSummary&&patch.summary_json)return Promise.resolve({data:null,error:new Error("durable_write_failed")}).then(resolve);
    if(matches())Object.assign(this.ep,patch);
    return Promise.resolve({data:null,error:null}).then(resolve);
   }
   return Promise.resolve({data:null,error:null}).then(resolve);
  };
  return q;
 }
}

beforeEach(()=>{mocks.chat.mockReset().mockResolvedValue({choices:[{message:{content:JSON.stringify({
 topics:["continuity"],user_goals:["finish continuity"],assistant_commitments:["continue safely"],
 stable_facts_candidates:[],contradictions:[],emotional_tone:{user:"focused",assistant:"steady"},followups:["verify restart"]
})}}]});});

describe("durable episode continuity summary",()=>{
 it("persists and reads back a scoped summary before reporting success",async()=>{
  const db=new EpisodeDb();
  const result=await summarizeEpisode({supabase:db as never,userId:"owner",projectId:"project",episodeId:"episode"});
  expect(result).toMatchObject({ok:true,already:false,summary:{topics:["continuity"],followups:["verify restart"]}});
  expect(db.ep.status).toBe("summarized");expect(db.ep.summary_json.user_goals).toEqual(["finish continuity"]);
 });
 it("rejects a foreign project before model work",async()=>{
  const db=new EpisodeDb();
  await expect(summarizeEpisode({supabase:db as never,userId:"owner",projectId:"other",episodeId:"episode"})).rejects.toThrow("episode_not_found");
  expect(mocks.chat).not.toHaveBeenCalled();
 });
 it("does not falsely report a summary complete when durable storage fails",async()=>{
  const db=new EpisodeDb();db.failSummary=true;
  await expect(summarizeEpisode({supabase:db as never,userId:"owner",projectId:"project",episodeId:"episode"})).rejects.toThrow("durable_write_failed");
  expect(db.ep.summary_json).toBeNull();
 });
});
