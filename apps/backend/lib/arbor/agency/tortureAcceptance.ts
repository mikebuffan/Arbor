export type AgencyTortureStep={
 id:string;
 status:"queued"|"running"|"checkpointed"|"completed"|"failed";
 attempt:number;
 sideEffectKey:string;
};
export type AgencyTortureResult={
 complete:boolean;
 nextAction:string|null;
 executed:string[];
 skippedDuplicates:string[];
 recoveredFailures:string[];
};

export function runBoundedAgencyTorture(input:{
 steps:readonly AgencyTortureStep[];
 completedSideEffects?:readonly string[];
 maxActions?:number;
}):AgencyTortureResult{
 const seen=new Set(input.completedSideEffects??[]);
 const executed:string[]=[]; const skippedDuplicates:string[]=[]; const recoveredFailures:string[]=[];
 const max=Math.max(1,Math.min(input.maxActions??32,64));
 let actions=0;
 for(const step of input.steps){
   if(actions>=max) return {complete:false,nextAction:step.id,executed,skippedDuplicates,recoveredFailures};
   if(step.status==="completed"){seen.add(step.sideEffectKey);continue;}
   if(step.status==="running") return {complete:false,nextAction:step.id,executed,skippedDuplicates,recoveredFailures};
   if(seen.has(step.sideEffectKey)){skippedDuplicates.push(step.id);continue;}
   if(step.status==="failed"){
     recoveredFailures.push(step.id);
     if(step.attempt>=3) continue;
   }
   seen.add(step.sideEffectKey); executed.push(step.id); actions++;
 }
 return {complete:true,nextAction:null,executed,skippedDuplicates,recoveredFailures};
}
