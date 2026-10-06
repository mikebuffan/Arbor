import {z} from "zod";
import type {ArchiveTarget,VerifiedArchiveTransport} from "./resumableArchive";
import type {HistoricalTurnInput} from "../../lib/memory/historicalIngest";
const Target=z.object({userId:z.string().uuid(),projectId:z.string().uuid()}).strict();
const Turn=z.object({source:z.string().min(1),sourceThreadId:z.string().min(1),sourceMessageId:z.string().min(1),
 sourceMessageIndex:z.number().int().nonnegative(),role:z.enum(["user","assistant","system"]),content:z.string().min(1),
 occurredAt:z.string().datetime({offset:true}).nullable()}).strict();
function literal(text:string,prefix:string){let n=0,tag:string;do{tag=`$${prefix}_${n++}$`;}while(text.includes(tag));return `${tag}${text}${tag}`;}

/** SQL for a trusted administrative transport, never exposed as a callable public endpoint.
 * Caller must bind the intended database separately. No secrets or environment discovery. */
export function buildExactArchiveBatchSql(input:{target:ArchiveTarget;turns:HistoricalTurnInput[];mode:"apply"|"verify"}){
 const target=Target.parse(input.target),turns=z.array(Turn).min(1).max(200).parse(input.turns);
 z.enum(["apply","verify"]).parse(input.mode);
 const ids=new Set(turns.map(t=>JSON.stringify([t.source,t.sourceMessageId])));
 if(ids.size!==turns.length)throw Error("archive_duplicate_batch_identity");
 const payload=JSON.stringify(turns.map(t=>({source:t.source,source_thread_id:t.sourceThreadId,source_message_id:t.sourceMessageId,
  source_message_index:t.sourceMessageIndex,role:t.role,content:t.content,occurred_at:t.occurredAt})));
 if(Buffer.byteLength(payload)>1000000)throw Error("archive_sql_batch_too_large");
 const incoming=`jsonb_to_recordset(payload) as t(source text,source_thread_id text,source_message_id text,source_message_index integer,role text,content text,occurred_at timestamptz)`;
 const match=`h.user_id='${target.userId}'::uuid and h.project_id='${target.projectId}'::uuid and h.source=t.source and h.source_message_id=t.source_message_id`;
 const same=`h.source_thread_id is not distinct from t.source_thread_id and h.source_message_index is not distinct from t.source_message_index and h.role is not distinct from t.role and h.content is not distinct from t.content and h.occurred_at is not distinct from t.occurred_at`;
 const insert=input.mode==="apply"?`
 if exists(select 1 from ${incoming} join public.historical_conversation_turns h on ${match} where not (${same})) then
  raise exception 'archive_destination_source_conflict';
 end if;
 insert into public.historical_conversation_turns(user_id,project_id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at)
 select '${target.userId}'::uuid,'${target.projectId}'::uuid,t.source,t.source_thread_id,t.source_message_id,t.source_message_index,t.role,t.content,t.occurred_at from ${incoming}
 on conflict do nothing;`:"";
 const body=`
declare payload jsonb := ${literal(payload,"arbor_payload")}::jsonb;
begin
 perform id from public.projects where id='${target.projectId}'::uuid and user_id='${target.userId}'::uuid for share;
 if not found then raise exception 'archive_project_not_owned'; end if;
 -- Both deployed uniqueness contracts apply. Protect participating importers
 -- and lock existing source rows against concurrent updates until verification.
 perform pg_advisory_xact_lock(hashtextextended('arbor-archive:${target.userId}:${target.projectId}',0));
 perform h.id from public.historical_conversation_turns h join ${incoming} on ${match} for update of h;
 ${insert}
 if exists(select 1 from ${incoming} left join public.historical_conversation_turns h on ${match} where h.id is null or not (${same})) then
  raise exception 'archive_destination_not_exact';
 end if;
end;
`;
 return `do ${literal(body,"arbor_block")};`;
}

export function createExactArchiveSqlTransport(input:{executeSql:(sql:string)=>Promise<void>}):VerifiedArchiveTransport{
 return {async applyExactBatch(target,turns){await input.executeSql(buildExactArchiveBatchSql({target,turns,mode:"apply"}));},
  async verifyExactBatch(target,turns){await input.executeSql(buildExactArchiveBatchSql({target,turns,mode:"verify"}));}};
}
