import{describe,expect,it,vi}from"vitest";
import{persistDiagnosticCheckpointVerified}from"../editorialPersistenceAdapter";
describe("verified editorial persistence",()=>{
 it("requires durable record and checkpoint readback",async()=>{
  const stored=new Set<string>();let checkpoint:any=null;
  const port={
   persistRecords:vi.fn(async(rows:readonly any[])=>{for(const row of rows)stored.add(row.recordKey);return{recordKeys:rows.map(x=>x.recordKey)};}),
   persistCheckpoint:vi.fn(async(cp:any)=>{checkpoint=cp;}),
   readRecordKeys:vi.fn(async()=>({recordKeys:[...stored]})),
   readCheckpoint:vi.fn(async()=>checkpoint),
  };
  const cp={manuscriptId:"m",chapterNumber:2,sourceSha256:"a".repeat(64),diagnosticFingerprint:"d",nextStage:"diagnostics" as const,completedRecordKeys:[],sequence:1};
  const out=await persistDiagnosticCheckpointVerified({port,manuscriptId:"m",chapterNumber:2,sourceSha256:"a".repeat(64),checkpoint:cp,diagnostics:[{engine:"rhythm",severity:"watch",message:"x",evidence:[]}]});
  expect(out.verified).toBe(true);expect(out.records[0].recordKey).toContain("m|2|editor_note|diagnostic:rhythm");
  expect(checkpoint.completedRecordKeys).toEqual([...stored]);
 });
});