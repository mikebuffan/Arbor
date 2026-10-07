export type CompletionEvidence={parentGoal:string;criteria:string[];satisfied:string[];failed:string[];receipts:string[]};
export function verifyCompletionEvidence(e:CompletionEvidence):{complete:boolean;missing:string[]}{
 const satisfied=new Set(e.satisfied);const missing=e.criteria.filter(x=>!satisfied.has(x));
 return{complete:missing.length===0&&e.failed.length===0&&e.receipts.length>0,missing};
}
