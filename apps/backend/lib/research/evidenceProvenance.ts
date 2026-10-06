export type EvidenceProvenance={evidenceId:string;sourceSha256:string;sourceLocator:string;sourceFamily:string;hopLineage:string[];counterevidenceIds:string[];uncertainty:number;findingVersion:number};
export function validateEvidenceProvenance(p:EvidenceProvenance):string[]{
 const errors:string[]=[];
 if(!p.evidenceId.trim())errors.push("missing evidence id");
 if(!/^[a-f0-9]{64}$/i.test(p.sourceSha256))errors.push("invalid source hash");
 if(!p.sourceLocator.trim())errors.push("missing source locator");
 if(!p.sourceFamily.trim())errors.push("missing source family");
 if(p.uncertainty<0||p.uncertainty>1)errors.push("uncertainty out of range");
 if(!Number.isSafeInteger(p.findingVersion)||p.findingVersion<1)errors.push("invalid finding version");
 if(new Set(p.hopLineage).size!==p.hopLineage.length)errors.push("cyclic/duplicate hop lineage");
 return errors;
}
export function independentCorroboration(rows:readonly EvidenceProvenance[]):number{return new Set(rows.map(x=>x.sourceFamily)).size;}

export function sourceIndependenceScore(rows:readonly EvidenceProvenance[]):number{
 if(!rows.length)return 0;
 const families=new Set(rows.map(x=>x.sourceFamily).filter(Boolean)).size;
 return Number((families/rows.length).toFixed(3));
}
