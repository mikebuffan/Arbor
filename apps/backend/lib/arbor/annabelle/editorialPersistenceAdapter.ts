import{diagnosticsToEditorialRecords,type AnnabelleDiagnosticRecord}from"./diagnosticRecords";
import{dedupeEditorialRecords}from"./editorialRecordDedup";
import{resumeEditorialCheckpoint,type EditorialCheckpoint}from"./editorialCheckpoint";
import type{AnnabelleDiagnostic}from"./editorialEngines";

export type PersistableDiagnosticRecord=AnnabelleDiagnosticRecord&{
 manuscriptId:string;
 chapterNumber:number;
 recordType:"editor_note";
 subject:string;
 sourceLocator:{chapterNumber:number;diagnosticIndex:number};
};

export type EditorialPersistencePort={
 persistRecords:(records:readonly PersistableDiagnosticRecord[])=>Promise<{recordKeys:string[]}>;
 persistCheckpoint:(checkpoint:EditorialCheckpoint)=>Promise<void>;
};

export async function persistDiagnosticCheckpoint(input:{
 port:EditorialPersistencePort;
 manuscriptId:string;
 chapterNumber:number;
 sourceSha256:string;
 checkpoint:EditorialCheckpoint;
 diagnostics:readonly AnnabelleDiagnostic[];
}):Promise<{checkpoint:EditorialCheckpoint;records:PersistableDiagnosticRecord[]}>{
 if(input.checkpoint.manuscriptId!==input.manuscriptId||input.checkpoint.chapterNumber!==input.chapterNumber)
  throw new Error("annabelle_persistence_scope_mismatch");
 const mapped=diagnosticsToEditorialRecords({diagnostics:input.diagnostics,chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256})
  .map(r=>({...r,manuscriptId:input.manuscriptId,chapterNumber:input.chapterNumber}));
 const deduped=dedupeEditorialRecords(mapped);
 const persisted=await input.port.persistRecords(deduped.unique);
 const checkpoint=resumeEditorialCheckpoint(input.checkpoint,{sourceSha256:input.sourceSha256,recordKeys:persisted.recordKeys});
 await input.port.persistCheckpoint(checkpoint);
 return{checkpoint,records:deduped.unique};
}
