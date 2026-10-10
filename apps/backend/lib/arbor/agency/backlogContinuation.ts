export type BacklogItem={
 id:string;
 dependencies:string[];
 status:"pending"|"complete"|"blocked";
 protectedBoundary?:boolean;
 /** Optional, trusted caller-supplied urgency; no model inference or authority grant. */
 priority?:number;
};
export type BacklogContinuationPlan={
 runnable:string[];
 waiting:string[];
 humanBoundaries:string[];
 complete:string[];
};

export function planBacklogContinuation(items:readonly BacklogItem[]):BacklogContinuationPlan{
 // Fail closed on malformed ranking input; preserve prior input order when
 // no trusted priority is present. Priority never bypasses dependencies or STOP.
 const ids=new Set<string>();
 for(const item of items){
  if(!item || typeof item.id!=="string" || !item.id.trim() ||
    item.id!==item.id.trim() || !Array.isArray(item.dependencies) ||
    item.dependencies.some(d=>typeof d!=="string"||!d.trim()) ||
    !["pending","complete","blocked"].includes(item.status) ||
    (item.protectedBoundary!==undefined&&typeof item.protectedBoundary!=="boolean"))
   throw new Error("backlog_invalid_item");
  // A completed and pending record sharing the same ID must never cause
  // a second execution of something already completed.
  if(ids.has(item.id))throw new Error("backlog_duplicate_id");
  ids.add(item.id);
  if(item.priority!==undefined&&
    (!Number.isSafeInteger(item.priority)||item.priority<0||item.priority>100))
   throw new Error("backlog_invalid_priority");
 }
 const completed=new Set(items.filter(x=>x.status==="complete").map(x=>x.id));
 const runnable:string[]=[];const waiting:string[]=[];const humanBoundaries:string[]=[];
 for(const item of items){
  if(item.status==="complete")continue;
  // A pending protected action is not safe to run just because it has
  // high priority. Existing approval and protected boundaries win first.
  if(item.protectedBoundary){humanBoundaries.push(item.id);continue;}
  const depsReady=item.dependencies.every(x=>completed.has(x));
  if(item.status==="pending"&&depsReady)runnable.push(item.id);else waiting.push(item.id);
 }
 const priorityOf=(id:string)=>items.find(x=>x.id===id)?.priority??0;
 // Stable ordering for equal priorities (Array.sort is stable on supported hosts).
 runnable.sort((a,b)=>priorityOf(b)-priorityOf(a));
 return{runnable,waiting,humanBoundaries,complete:[...completed]};
}
export function nextIndependentWork(items:readonly BacklogItem[],blockedId:string):string|null{
 const plan=planBacklogContinuation(items);
 return plan.runnable.find(id=>id!==blockedId)??null;
}
