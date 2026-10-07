export type EditorialCheckpoint={
  manuscriptId:string;
  chapterNumber:number;
  sourceSha256:string;
  diagnosticFingerprint:string;
  nextStage:"diagnostics"|"rewrite-review"|"self-check"|"complete";
  completedRecordKeys:string[];
  sequence:number;
};
export function resumeEditorialCheckpoint(checkpoint:EditorialCheckpoint,input:{sourceSha256:string;recordKeys:readonly string[]}):EditorialCheckpoint{
 if(checkpoint.sourceSha256!==input.sourceSha256)throw new Error("annabelle_checkpoint_source_changed");
 const completed=new Set(checkpoint.completedRecordKeys);for(const key of input.recordKeys)completed.add(key);
 return{...checkpoint,completedRecordKeys:[...completed].sort(),sequence:checkpoint.sequence+1};
}
export function advanceEditorialCheckpoint(checkpoint:EditorialCheckpoint,next:EditorialCheckpoint["nextStage"]):EditorialCheckpoint{
 const order=["diagnostics","rewrite-review","self-check","complete"] as const;
 if(order.indexOf(next)<order.indexOf(checkpoint.nextStage))throw new Error("annabelle_checkpoint_regression");
 return{...checkpoint,nextStage:next,sequence:checkpoint.sequence+1};
}
