import{diagnosticsToEditorialRecords,type AnnabelleDiagnosticRecord}from"./diagnosticRecords";
import{dedupeEditorialRecords,editorialRecordKey}from"./editorialRecordDedup";
import{resumeEditorialCheckpoint,type EditorialCheckpoint}from"./editorialCheckpoint";
import type{AnnabelleDiagnostic}from"./editorialEngines";

export type PersistableDiagnosticRecord=AnnabelleDiagnosticRecord&{
 manuscriptId:string;
 chapterNumber:number;
 recordType:"editor_note";
 subject:string;
 sourceLocator:{chapterNumber:number;diagnosticIndex:number};
 recordKey:string;
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
 if(input.checkpoint.sourceSha256!==input.sourceSha256)
  throw new Error("annabelle_checkpoint_source_changed");
 const mapped=diagnosticsToEditorialRecords({diagnostics:input.diagnostics,chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256})
  .map(r=>{
   const base={...r,manuscriptId:input.manuscriptId,chapterNumber:input.chapterNumber};
   return{...base,recordKey:editorialRecordKey(base)};
  });
 const deduped=dedupeEditorialRecords(mapped);
 const persisted=await input.port.persistRecords(deduped.unique);
 const expectedKeys=new Set(deduped.unique.map(record=>record.recordKey));
 if(!persisted||!Array.isArray(persisted.recordKeys)||
    persisted.recordKeys.some(key=>typeof key!=="string"||!expectedKeys.has(key))||
    [...expectedKeys].some(key=>!persisted.recordKeys.includes(key)))
  throw new Error("annabelle_persistence_record_receipt_mismatch");
 const checkpoint=resumeEditorialCheckpoint(input.checkpoint,{sourceSha256:input.sourceSha256,recordKeys:persisted.recordKeys});
 await input.port.persistCheckpoint(checkpoint);
 return{checkpoint,records:deduped.unique};
}


export type VerifiedEditorialPersistencePort=EditorialPersistencePort&{
 readRecordKeys:(input:{manuscriptId:string;chapterNumber:number;sourceSha256:string})=>Promise<{recordKeys:string[]}>;
 readCheckpoint:(input:{manuscriptId:string;chapterNumber:number})=>Promise<EditorialCheckpoint|null>;
};

export async function persistDiagnosticCheckpointVerified(input:{
 port:VerifiedEditorialPersistencePort;
 manuscriptId:string;
 chapterNumber:number;
 sourceSha256:string;
 checkpoint:EditorialCheckpoint;
 diagnostics:readonly AnnabelleDiagnostic[];
}):Promise<{checkpoint:EditorialCheckpoint;records:PersistableDiagnosticRecord[];verified:true}>{
 const written=await persistDiagnosticCheckpoint(input);
 const [recordReadback,checkpointReadback]=await Promise.all([
  input.port.readRecordKeys({manuscriptId:input.manuscriptId,chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256}),
  input.port.readCheckpoint({manuscriptId:input.manuscriptId,chapterNumber:input.chapterNumber}),
 ]);
 const keys=new Set(recordReadback.recordKeys);
 for(const key of written.checkpoint.completedRecordKeys)if(!keys.has(key))
  throw new Error("annabelle_persistence_record_readback_missing");
 if(!checkpointReadback)throw new Error("annabelle_persistence_checkpoint_readback_missing");
 if(checkpointReadback.manuscriptId!==input.manuscriptId||checkpointReadback.chapterNumber!==input.chapterNumber||checkpointReadback.sourceSha256!==input.sourceSha256)
  throw new Error("annabelle_persistence_checkpoint_readback_scope_mismatch");
 if(!Number.isSafeInteger(checkpointReadback.sequence)||checkpointReadback.sequence<written.checkpoint.sequence)
  throw new Error("annabelle_persistence_checkpoint_readback_stale");
 // A checkpoint row with the right owner/source and sequence is not enough:
 // confirm the saved diagnostic and all expected record references survived.
 // Later independent work may add keys, but cannot erase this write's keys.
 if(checkpointReadback.diagnosticFingerprint!==written.checkpoint.diagnosticFingerprint||
    checkpointReadback.nextStage!==written.checkpoint.nextStage)
  throw new Error("annabelle_persistence_checkpoint_readback_content_mismatch");
 if(!Array.isArray(checkpointReadback.completedRecordKeys)||
    written.checkpoint.completedRecordKeys.some(key=>!checkpointReadback.completedRecordKeys.includes(key)))
  throw new Error("annabelle_persistence_checkpoint_readback_records_missing");
 return{...written,verified:true};
}
