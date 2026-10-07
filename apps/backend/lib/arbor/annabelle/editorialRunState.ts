import{advanceEditorialCheckpoint,resumeEditorialCheckpoint,type EditorialCheckpoint}from"./editorialCheckpoint";
import{dedupeEditorialRecords,type EditorialRecordIdentity}from"./editorialRecordDedup";

export type EditorialRunState<T extends EditorialRecordIdentity>={
 checkpoint:EditorialCheckpoint;
 records:T[];
};

export function resumeEditorialRun<T extends EditorialRecordIdentity>(input:{
 state:EditorialRunState<T>;
 sourceSha256:string;
 incomingRecords:readonly T[];
 nextStage?:EditorialCheckpoint["nextStage"];
}):EditorialRunState<T>{
 const combined=dedupeEditorialRecords([...input.state.records,...input.incomingRecords]);
 let checkpoint=resumeEditorialCheckpoint(input.state.checkpoint,{sourceSha256:input.sourceSha256,recordKeys:combined.unique.map(r=>[r.recordType,r.subject,r.sourceSha256].join(":"))});
 if(input.nextStage)checkpoint=advanceEditorialCheckpoint(checkpoint,input.nextStage);
 return{checkpoint,records:combined.unique};
}
