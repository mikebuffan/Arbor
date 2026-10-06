import {describe,expect,it,vi} from "vitest";
import {buildExactArchiveBatchSql,createExactArchiveSqlTransport} from "../../../scripts/import_chatgpt/exactArchiveSql";
const target={userId:"11111111-1111-4111-8111-111111111111",projectId:"22222222-2222-4222-8222-222222222222"};
const turn={source:"chatgpt",sourceThreadId:"thread",sourceMessageId:"message",sourceMessageIndex:0,role:"user" as const,content:"original",occurredAt:null};
describe("guarded exact archive SQL adapter",()=>{
 it("uses original contents as escaped data and preserves repeats without update",()=>{
  const content="quote ' ; $arbor_block_0$ $arbor_payload_0$ \\ DROP TABLE projects;",sql=buildExactArchiveBatchSql({target,turns:[{...turn,content}],mode:"apply"});
  expect(sql.startsWith("do $arbor_block_1$")).toBe(true);expect(sql).toContain("$arbor_payload_1$");expect(sql).toContain("on conflict do nothing");expect(sql).not.toContain("do update");expect(sql).toContain("archive_destination_source_conflict");expect(sql).toContain("archive_destination_not_exact");expect(sql).toContain("for update of h");expect(sql).toContain("for share");
 });
 it("rejects malformed scope, duplicate global identities, unknown fields and unbounded payload before execution",()=>{
  for(const args of [{target:{...target,userId:"' injected"},turns:[turn]}, {target,turns:[turn,turn]}, {target,turns:[{...turn,userId:target.userId}]}, {target,turns:[{...turn,content:"x".repeat(1000001)}]}])expect(()=>buildExactArchiveBatchSql({...args,mode:"apply"} as any)).toThrow();
 });
 it("verify mode emits no insert or update statements and preserves all-field matching",()=>{
  const sql=buildExactArchiveBatchSql({target,turns:[turn],mode:"verify"});expect(sql).not.toContain("insert into");expect(sql).not.toContain("update public");for(const field of ["source_thread_id","source_message_index","role","content","occurred_at"])expect(sql).toContain(`h.${field} is not distinct from t.${field}`);
 });
 it("propagates executor errors rather than returning a successful receipt",async()=>{
  const executeSql=vi.fn(async()=>{throw Error("database_unavailable");});const transport=createExactArchiveSqlTransport({executeSql});await expect(transport.applyExactBatch(target,[turn])).rejects.toThrow("database_unavailable");expect(executeSql).toHaveBeenCalledOnce();
 });
});
