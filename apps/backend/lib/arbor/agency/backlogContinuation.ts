export type BacklogItem={
 id:string;
 dependencies:string[];
 status:"pending"|"complete"|"blocked";
 protectedBoundary?:boolean;
};
export type BacklogContinuationPlan={
 runnable:string[];
 waiting:string[];
 humanBoundaries:string[];
 complete:string[];
};

export function planBacklogContinuation(items:readonly BacklogItem[]):BacklogContinuationPlan{
 const completed=new Set(items.filter(x=>x.status==="complete").map(x=>x.id));
 const runnable:string[]=[];const waiting:string[]=[];const humanBoundaries:string[]=[];
 for(const item of items){
  if(item.status==="complete")continue;
  if(item.status==="blocked"&&item.protectedBoundary){humanBoundaries.push(item.id);continue;}
  const depsReady=item.dependencies.every(x=>completed.has(x));
  if(item.status==="pending"&&depsReady)runnable.push(item.id);else waiting.push(item.id);
 }
 return{runnable,waiting,humanBoundaries,complete:[...completed]};
}
export function nextIndependentWork(items:readonly BacklogItem[],blockedId:string):string|null{
 const plan=planBacklogContinuation(items);
 return plan.runnable.find(id=>id!==blockedId)??null;
}
