export type PatternHopCheckpoint={
 runId:string;
 sequence:number;
 cursor:string;
 visitedEvidenceIds:string[];
 emittedFindingKeys:string[];
 stopped:boolean;
};
export function checkpointPatternHopRun(current:PatternHopCheckpoint,input:{runId:string;cursor:string;visitedEvidenceIds?:readonly string[];emittedFindingKeys?:readonly string[]}):PatternHopCheckpoint{
 if(current.stopped)throw new Error("pattern_hop_stopped");
 if(current.runId!==input.runId)throw new Error("pattern_hop_run_identity_mismatch");
 return{
  ...current,
  sequence:current.sequence+1,
  cursor:input.cursor,
  visitedEvidenceIds:[...new Set([...current.visitedEvidenceIds,...(input.visitedEvidenceIds??[])])].sort(),
  emittedFindingKeys:[...new Set([...current.emittedFindingKeys,...(input.emittedFindingKeys??[])])].sort(),
 };
}
export function resumePatternHopRun(checkpoint:PatternHopCheckpoint,input:{runId:string;expectedSequence:number}):PatternHopCheckpoint{
 if(checkpoint.runId!==input.runId)throw new Error("pattern_hop_run_identity_mismatch");
 if(checkpoint.sequence!==input.expectedSequence)throw new Error("pattern_hop_stale_checkpoint");
 if(checkpoint.stopped)throw new Error("pattern_hop_stopped");
 return{...checkpoint};
}
export function findingAlreadyEmitted(checkpoint:PatternHopCheckpoint,key:string):boolean{return checkpoint.emittedFindingKeys.includes(key);}
