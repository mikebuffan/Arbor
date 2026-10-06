import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({history:vi.fn(),episodes:vi.fn(),memories:vi.fn()}));
vi.mock("../historicalRecall",()=>({readHistoricalConversationRecall:mocks.history}));
vi.mock("../retrieval",()=>({getMemoryContext:mocks.memories}));
vi.mock("@/lib/arbor/episodes/episodeRecall",()=>({getEpisodeRecall:mocks.episodes}));
import {readArborMemoryRecall} from "../readRecall";
function database(count:number|null=42,error:any=null){const filters:any[]=[];const q:any={select:vi.fn(),eq:vi.fn(),then:(resolve:any)=>Promise.resolve({count,error}).then(resolve)};q.select.mockReturnValue(q);q.eq.mockImplementation((k:string,v:any)=>{filters.push([k,v]);return q;});return{supabase:{from:vi.fn(()=>q)} as any,filters,q};}
const input={userId:"owner",projectId:"project",query:"archive question"};
const item=(id:string,extra={})=>({id,project_id:null,conversation_id:null,scope:"global",key:"project.ongoing",
 content_text:"Memory integration",tier:"core",pinned:true,locked:false,status:"active",deleted_at:null,
 user_trigger_only:false,importance:10,confidence:1,updated_at:"2026-10-02T00:00:00Z",...extra});
beforeEach(()=>{vi.clearAllMocks();mocks.history.mockResolvedValue({turns:[],lexical:"ok",semantic:"disabled",truncated:false});mocks.episodes.mockResolvedValue([]);mocks.memories.mockResolvedValue({core:[],normal:[],sensitive:[]});});
describe("independent memory read receipts",()=>{
 it("saved goal retrieval terms do not reveal a sensitive record on a short acknowledgment",async()=>{
  mocks.memories.mockResolvedValue({core:[item("sensitive",{tier:"sensitive",key:"private.record"})],normal:[],sensitive:[]});
  const result=await readArborMemoryRecall({...input,query:"private record\nGo",revealUserText:"Go",supabase:database().supabase});
  expect(result.memories.items).toEqual([]);
 });
 it("distinguishes unmatched stored history from an empty archive and scopes inventory",async()=>{
  const db=database();const result=await readArborMemoryRecall({...input,supabase:db.supabase});
  expect(result.archive).toMatchObject({totalTurns:42,inventoryStatus:"ok",turns:[]});
  expect(db.filters).toEqual([["user_id","owner"],["project_id","project"]]);
  expect(db.q.select).toHaveBeenCalledWith("id",{count:"exact",head:true});
  expect(mocks.history).toHaveBeenCalledWith(expect.objectContaining({useVectorSearch:false,userId:"owner",projectId:"project"}));
  expect(mocks.memories).toHaveBeenCalledWith(expect.objectContaining({useVectorSearch:false,authedUserId:"owner"}));
  expect((await readArborMemoryRecall({...input,supabase:database(0).supabase})).archive.totalTurns).toBe(0);
 });
 it("keeps independent evidence when another store is unavailable",async()=>{
  mocks.history.mockRejectedValue(new Error("archive inaccessible"));mocks.memories.mockRejectedValue(new Error("private payload"));
  mocks.episodes.mockResolvedValue([{id:"episode",topics:["One Arbor"],userGoals:[],assistantCommitments:[],followups:[]}]);
  const result=await readArborMemoryRecall({...input,supabase:database(null,{code:"42P01"}).supabase});
  expect(result.archive).toMatchObject({totalTurns:null,inventoryStatus:"unavailable",lexical:"failed"});
  expect(result.episodes.items[0].id).toBe("episode");expect(result.memories.status).toBe("unavailable");
  expect(result.recallPrompt).not.toContain("private payload");
 });
 it("enforces reveal and deletion gates before returning durable memories",async()=>{
  mocks.memories.mockResolvedValue({core:[item("ordinary"),item("sensitive",{tier:"sensitive",key:"private.record"}),
   item("trigger",{user_trigger_only:true,key:"private.other"}),item("deleted",{deleted_at:"2026-10-01"})],normal:[],sensitive:[]});
  const result=await readArborMemoryRecall({...input,supabase:database().supabase});
  expect(result.memories.items.map(i=>i.id)).toEqual(["ordinary"]);
 });
 it("clips displayed records with flags and leaves source values intact",async()=>{
  const source=item("long",{content_text:"x".repeat(5000)});
  mocks.memories.mockResolvedValue({core:[source],normal:[],sensitive:[]});
  mocks.episodes.mockResolvedValue([{id:"episode",topics:["z".repeat(5000)],userGoals:[],assistantCommitments:[],followups:[]}]);
  const result=await readArborMemoryRecall({...input,supabase:database().supabase});
  expect(result.memories.items[0]).toMatchObject({contentTruncated:true,content:"x".repeat(1000)});
  expect(result.episodes.items[0].contentTruncated).toBe(true);
  expect(result.episodes.items[0].topics[0].length).toBe(300);expect(source.content_text.length).toBe(5000);
 });
});
