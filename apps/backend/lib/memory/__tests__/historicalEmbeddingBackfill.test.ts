import {describe,expect,it,vi} from "vitest";
import {applyHistoricalEmbeddingBackfill,planHistoricalEmbeddingBackfill} from "../historicalEmbeddingBackfill";

const owner="11111111-1111-4111-8111-111111111111",project="22222222-2222-4222-8222-222222222222";
function source(id:string,user_id=owner,project_id=project){
 return{id,user_id,project_id,source:"chatgpt",source_thread_id:"thread",source_message_id:"message-"+id,
  source_message_index:1,role:"user",content:"remembered context "+id,occurred_at:"2026-01-01T00:00:00Z",embedding:null as number[]|null,updated_at:null as string|null};
}
class Db{
 rows=[source("a"),source("b","foreign",project)];
 from(table:string){
  const filters:Record<string,unknown>={};const nulls:Record<string,unknown>={};let patch:any=null;
  const match=(row:any)=>Object.entries(filters).every(([k,v])=>row[k]===v)&&Object.entries(nulls).every(([k,v])=>row[k]===v);
  const q:any={};
  q.select=()=>q;q.eq=(k:string,v:unknown)=>{filters[k]=v;return q;};q.is=(k:string,v:unknown)=>{nulls[k]=v;return q;};
  q.order=()=>q;q.update=(value:any)=>{patch=value;return q;};
  q.limit=async(n:number)=>{
   if(table==="historical_conversation_turns")return{data:this.rows.filter(match).slice(0,n).map(r=>({...r})),error:null};
   return{data:[],error:null};
  };
  q.maybeSingle=async()=>{
   if(table==="projects")return{data:filters.id===project&&filters.user_id===owner?{id:project}:null,error:null};
   const row=this.rows.find(match);
   if(!row)return{data:null,error:null};
   if(patch){Object.assign(row,patch);return{data:{id:row.id},error:null};}
   return{data:{...row},error:null};
  };
  return q;
 }
}

describe("historical semantic backfill",()=>{
 it("plans only owned missing embeddings with source-bound identity",async()=>{
  const db=new Db();const plan=await planHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project});
  expect(plan).toMatchObject({version:1,userId:owner,projectId:project,items:[{id:"a",source:"chatgpt",sourceThreadId:"thread",sourceMessageId:"message-a",sourceMessageIndex:1}]});
  expect(plan.items[0].contentSha256).toMatch(/^[a-f0-9]{64}$/);
 });
 it("is default closed and resumes idempotently after a durable embedding write",async()=>{
  const db=new Db(),plan=await planHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project});
  const embed=vi.fn(async()=>[[0.1,0.2]]);
  await expect(applyHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project,plan,enabled:false,embedBatch:embed})).rejects.toThrow("disabled");
  expect(embed).not.toHaveBeenCalled();
  expect(await applyHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project,plan,enabled:true,embedBatch:embed,now:()=> "2026-10-06T00:00:00Z"}))
   .toMatchObject({applied:1,alreadyEmbedded:0});
  expect(await applyHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project,plan,enabled:true,embedBatch:embed}))
   .toMatchObject({applied:0,alreadyEmbedded:1});
  expect(embed).toHaveBeenCalledTimes(1);
 });
 it("rejects changed source content before sending it for embedding",async()=>{
  const db=new Db(),plan=await planHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project});
  db.rows[0].content="changed after checkpoint";const embed=vi.fn(async()=>[[0.1]]);
  await expect(applyHistoricalEmbeddingBackfill({supabase:db as never,userId:owner,projectId:project,plan,enabled:true,embedBatch:embed})).rejects.toThrow("source_changed");
  expect(embed).not.toHaveBeenCalled();
 });
 it("does not cross owner scope",async()=>{
  const db=new Db();
  await expect(planHistoricalEmbeddingBackfill({supabase:db as never,userId:"33333333-3333-4333-8333-333333333333",projectId:project})).rejects.toThrow("project_not_found");
 });
});
