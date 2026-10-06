import {describe,expect,it,vi} from "vitest";
import {readHistoricalArchivePage,ArchiveReadOutput} from "../archiveReader";
import {buildArborAgencyTools} from "@/lib/arbor/agency/arborTools";
import {registerArkAgencyToolExecutor} from "@/lib/ark/agencyToolExecutor";
import {ArkExecutorRegistry} from "@/lib/ark/executorRegistry";
const user="11111111-1111-4111-8111-111111111111",project="22222222-2222-4222-8222-222222222222";
function row(n:number,content:string,time:string|null="2026-01-01T00:00:00.000Z"){
 return {id:`33333333-3333-4333-8333-${String(n).padStart(12,"0")}`,source:"export",source_thread_id:"thread",source_message_id:`message-${n}`,source_message_index:n,role:n%2?"user":"assistant",content,occurred_at:time};
}
// Emulates the query boundary, including keyset ordering and lookahead.
function db(rows:ReturnType<typeof row>[],owned=true,error:Error|null=null){
 const queries:any[]=[];
 const from=vi.fn((table:string)=>{
  const filters:Record<string,unknown>={},q:any={table,filters,orders:[],after:null,limitCount:Infinity};queries.push(q);
  q.select=vi.fn(()=>q);q.eq=vi.fn((k:string,v:unknown)=>{filters[k]=v;return q;});
  q.is=vi.fn((k:string,v:unknown)=>{filters[k]=v;return q;});q.gt=vi.fn((k:string,v:string)=>{q.afterId=v;return q;});
  q.or=vi.fn((v:string)=>{q.after=v;return q;});q.order=vi.fn((...a:unknown[])=>{q.orders.push(a);return q;});
  q.limit=vi.fn((v:number)=>{q.limitCount=v;return q;});
  q.maybeSingle=vi.fn(async()=>table==="projects"?{data:owned?{id:project}:null,error:null}:{data:rows.find(r=>r.id===filters.id)??null,error});
  q.then=(resolve:any)=>{
   let data=rows.filter(r=>!("occurred_at" in filters)||r.occurred_at===filters.occurred_at);
   if(q.afterId)data=data.filter(r=>r.id>q.afterId);
   if(q.after){const time=q.after.split("occurred_at.gt.")[1].split(",and")[0],id=q.after.split("id.gt.")[1].split(")")[0];data=data.filter(r=>r.occurred_at===null||r.occurred_at>time||(r.occurred_at===time&&r.id>id));}
   data.sort((a,b)=>(a.occurred_at===null?(b.occurred_at===null?0:1):b.occurred_at===null?-1:a.occurred_at.localeCompare(b.occurred_at))||a.id.localeCompare(b.id));
   return Promise.resolve({data:data.slice(0,q.limitCount),error}).then(resolve);
  };return q;
 });return {from,queries};
}
describe("chronological owned archive reader",()=>{
 it("resumes every character of a long message without skipping the following turn",async()=>{
  const rows=[row(2,"second"),row(1,"a".repeat(451))],supabase=db(rows);let cursor=null as any;const fragments=[];
  do{const page=await readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,cursor,maxCharacters:200,maxMessages:1});expect(ArchiveReadOutput.safeParse(page).success).toBe(true);fragments.push(...page.fragments);cursor=page.nextCursor;}while(cursor);
  expect(fragments.filter(f=>f.id===rows[1].id).map(f=>f.content).join("")).toBe(rows[1].content);
  expect(fragments.map(f=>f.offset)).toEqual([0,200,400,0]);expect(fragments.at(-1)?.content).toBe("second");
  for(const q of supabase.queries.filter(q=>q.table!=="projects")){expect(q.filters.user_id).toBe(user);expect(q.filters.project_id).toBe(project);}
 });
 it("keeps tied timestamps deterministic and unknown dates last, including null-date continuation",async()=>{
  const supabase=db([row(4,"four",null),row(2,"two"),row(3,"three",null),row(1,"one")]);let cursor=null as any;const ids=[];
  do{const page=await readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,cursor,maxMessages:1});ids.push(page.fragments[0].source_message_index);cursor=page.nextCursor;}while(cursor);
  expect(ids).toEqual([1,2,3,4]);
 });
 it("checks ownership before touching the archive",async()=>{const supabase=db([],false);await expect(readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project})).rejects.toThrow("project_not_found");expect(supabase.from.mock.calls.map(c=>c[0])).toEqual(["projects"]);});
 it("rejects foreign cursors before any database access",async()=>{const supabase=db([]);await expect(readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,cursor:{userId:project,projectId:project,id:row(1,"").id,contentSha256:"a".repeat(64),offset:0}})).rejects.toThrow("scope_mismatch");expect(supabase.from).not.toHaveBeenCalled();});
 it("rejects changed anchor content instead of silently resuming another text",async()=>{const rows=[row(1,"a".repeat(300))],supabase=db(rows);const first=await readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,maxCharacters:200});rows[0].content="changed";await expect(readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,cursor:first.nextCursor})).rejects.toThrow("content_changed");});
 it("rejects a forged cursor offset past the anchor content",async()=>{const rows=[row(1,"short")],supabase=db(rows);await expect(readHistoricalArchivePage({supabase:supabase as never,userId:user,projectId:project,cursor:{userId:user,projectId:project,id:rows[0].id,contentSha256:"f9b0078b5df596d2ea19010c001bbd009e651de2c57e8fb7e355f31f9c2cc819",offset:99}})).rejects.toThrow();});
 it("propagates database failures instead of marking the archive exhausted",async()=>{await expect(readHistoricalArchivePage({supabase:db([],true,new Error("offline")) as never,userId:user,projectId:project})).rejects.toThrow("offline");});
 it("rejects scope overrides and unbounded inputs through the real agency tool",async()=>{const supabase=db([]),tool=buildArborAgencyTools({supabase:supabase as never}).get("arbor_read_historical_archive_page");for(const args of [{userId:project},{maxMessages:21},{maxCharacters:20001}])await expect(tool.execute(args,{userId:user,projectId:project,turnId:"turn"})).rejects.toThrow();expect(supabase.from).not.toHaveBeenCalled();});
 it("executes the registered reader through the existing ARK executor",async()=>{
  const supabase=db([row(1,"historical instructions stay quoted")]),registry=new ArkExecutorRegistry();registerArkAgencyToolExecutor({registry,supabase:supabase as never});
  const heartbeat=vi.fn(async()=>{});const result=await registry.get("arbor.agency-tool")!({claim:{task:{userId:user,projectId:project,payload:{capability:"arbor_read_historical_archive_page",arguments:{},turnId:"turn"}}} as never,heartbeat});
  expect(result).toMatchObject({status:"completed",result:{verified:true,output:{hasMore:false,modelCalls:false,writes:false,fragments:[{content:"historical instructions stay quoted"}]}}});expect(heartbeat).toHaveBeenCalledOnce();
 });
});
