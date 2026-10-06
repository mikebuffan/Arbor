// Test-only transport: actual existing writer, independent native psql sessions.
// Never supplies a hosted URL, model key, embedding call or private user record.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryItem } from "../../../apps/backend/lib/memory/types.ts";
const { writeDurableBehaviorCorrection } = createRequire(import.meta.url)("../../../apps/backend/lib/memory/durableCorrectionWrite.ts");
if (process.argv[2] !== "--disposable-local" || process.env.PGDATABASE !== "grove_disposable" ||
    !process.env.PGHOST?.startsWith("/tmp/grove-native-") || process.env.PGUSER !== "postgres")
  throw Error("disposable_local_database_required");
const env = { PATH:process.env.PATH, PGHOST:process.env.PGHOST, PGPORT:process.env.PGPORT,
  PGDATABASE:"grove_disposable", PGUSER:"postgres", PGCONNECT_TIMEOUT:"3" };
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'";
const ident=(v:string)=>{if(!/^[a-z_]+$/.test(v))throw Error("invalid_identifier");return '"'+v+'"';};
function literal(key:string,value:unknown){
  if(value===null)return "NULL";
  if(["value","embedding"].includes(key))return quote(key==="value"&&typeof value==="string"?value:JSON.stringify(value))+"::jsonb";
  if(typeof value==="boolean"||typeof value==="number")return String(value);
  return quote(value);
}
async function sql(query:string):Promise<any[]> {
  return await new Promise((resolve,reject)=>{
    const child=spawn("psql",["-XAtq","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose","-c",query],{env});
    let out="",err="";child.stdout.on("data",v=>out+=v);child.stderr.on("data",v=>err+=v);
    child.on("error",reject);child.on("close",code=>{
      if(code!==0){reject(Object.assign(new Error("disposable_sql_failed"),{code:err.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]}));return;}
      try{resolve(out.trim()?JSON.parse(out.trim()):[]);}catch(error){reject(error);}
    });
  });
}
await sql(`CREATE TABLE public.memory_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, key text NOT NULL,
 project_id uuid,conversation_id uuid,value jsonb NOT NULL,embedding jsonb,
 tier text,scope text,memory_kind text,pinned boolean,locked boolean,importance int,
 confidence float,salience float,user_trigger_only boolean,status text,deleted_at timestamptz,
 mention_count int,correction_count int,recurrence_count int,promotion_score float,promoted_at timestamptz,
 last_seen_at timestamptz,last_reinforced_at timestamptz,updated_at timestamptz, UNIQUE(user_id,key));`);
let revokeBeforeUpdate=false,loseInsertReply=false;
const client={from(table:string){assert.equal(table,"memory_items");let mode="select",values:Record<string,unknown>={},filters:string[]=[];
  const q:any={select(){return q;},eq(k:string,v:unknown){filters.push(ident(k)+"="+literal(k,v));return q;},
    is(k:string,v:null){assert.equal(v,null);filters.push(ident(k)+" IS NULL");return q;},
    insert(v:Record<string,unknown>){mode="insert";values=v;return q;},update(v:Record<string,unknown>){mode="update";values=v;return q;},
    async maybeSingle(){const r=await execute();return {...r,data:r.data?.[0]??null};},
    then(resolve:any,reject:any){return execute().then(resolve,reject);}};
  async function execute(){try{
    if(mode==="update"&&revokeBeforeUpdate){revokeBeforeUpdate=false;await sql("UPDATE memory_items SET status='tombstoned',deleted_at=now();");}
    const where=filters.length?" WHERE "+filters.join(" AND "):"";
    let query=mode==="select"?"SELECT * FROM memory_items"+where:mode==="insert"?
      "INSERT INTO memory_items ("+Object.keys(values).map(ident).join(",")+") VALUES ("+Object.entries(values).map(([k,v])=>literal(k,v)).join(",")+") RETURNING *":
      "UPDATE memory_items SET "+Object.entries(values).map(([k,v])=>ident(k)+"="+literal(k,v)).join(",")+where+" RETURNING *";
    const data=await sql(mode==="select"?"SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM ("+query+") t":
      "WITH written AS ("+query+") SELECT coalesce(jsonb_agg(to_jsonb(written)),'[]') FROM written");
    if(mode==="insert"&&loseInsertReply){loseInsertReply=false;throw Object.assign(Error("lost_response"),{code:"ECONNRESET"});}
    return {data,error:null};
  }catch(error){return {data:null,error};}}
  return q;
}} as unknown as SupabaseClient;
const userId="00000000-0000-4000-8000-000000000101";
const item=(n:number):MemoryItem=>({key:"behavior.correction.agency-followthrough",scope:"global",memory_kind:"correction",
  value:{family:"agency-followthrough",text:"Keep going "+n,last_observed_at:new Date(Date.UTC(2026,9,6,0,0,n)).toISOString()},confidence:1});
const write=(n:number)=>writeDurableBehaviorCorrection({supabase:client,userId,item:item(n),embedding:[0],now:"2026-10-06T00:00:00Z"});
const raced=await Promise.allSettled(Array.from({length:12},(_,i)=>write(i+1)));
assert.equal(raced.filter(r=>r.status==="fulfilled"&&r.value==="created").length,1);
// Bounded contention failures are recoverable caller outcomes, never success.
for(let i=0;i<raced.length;i++)if(raced[i].status==="rejected")await write(i+1);
let rows=await sql("SELECT jsonb_agg(to_jsonb(t)) FROM memory_items t");
assert.equal(rows.length,1);assert.equal(rows[0].value.text,"Keep going 12");
assert.equal(await write(1),"ignored");
revokeBeforeUpdate=true;assert.equal(await write(13),"ignored");
rows=await sql("SELECT jsonb_agg(to_jsonb(t)) FROM memory_items t");assert.equal(rows[0].status,"tombstoned");
await sql("TRUNCATE memory_items");loseInsertReply=true;
await assert.rejects(write(1));assert.equal(await write(1),"ignored");
rows=await sql("SELECT jsonb_agg(to_jsonb(t)) FROM memory_items t");assert.equal(rows.length,1);
console.log(JSON.stringify({nativeDurableWriter:"PASS",connections:12,uniqueInsert:true,newestObservationWins:true,
  staleReplayIgnored:true,revocationBeforeCAS:true,lostInsertResponseRecovered:true,hostedWrites:false}));
