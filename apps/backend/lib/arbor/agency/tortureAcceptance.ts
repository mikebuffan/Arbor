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
 exhaustedFailures:string[];
};

export function runBoundedAgencyTorture(input:{
 steps:readonly AgencyTortureStep[];
 completedSideEffects?:readonly string[];
 maxActions?:number;
}):AgencyTortureResult{
 const seen=new Set(input.completedSideEffects??[]);
 const executed:string[]=[]; const skippedDuplicates:string[]=[]; const recoveredFailures:string[]=[]; const exhaustedFailures:string[]=[];
 const max=Math.max(1,Math.min(input.maxActions??32,64));
 let actions=0;
 for(const step of input.steps){
   if(actions>=max) return {complete:false,nextAction:step.id,executed,skippedDuplicates,recoveredFailures,exhaustedFailures};
   if(step.status==="completed"){seen.add(step.sideEffectKey);continue;}
   if(step.status==="running") return {complete:false,nextAction:step.id,executed,skippedDuplicates,recoveredFailures,exhaustedFailures};
   if(seen.has(step.sideEffectKey)){skippedDuplicates.push(step.id);continue;}
   if(step.status==="failed"){
     if(step.attempt>=3){
       exhaustedFailures.push(step.id);
       return {complete:false,nextAction:step.id,executed,skippedDuplicates,recoveredFailures,exhaustedFailures};
     }
     recoveredFailures.push(step.id);
   }
   seen.add(step.sideEffectKey); executed.push(step.id); actions++;
 }
 return {complete:exhaustedFailures.length===0,nextAction:null,executed,skippedDuplicates,recoveredFailures,exhaustedFailures};
}
