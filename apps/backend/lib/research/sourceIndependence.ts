export type IndependenceEvidence={evidenceRef:string;sourceId:string;sourceFamilyId:string;derivesFromEvidenceRefs:readonly string[]};
export type IndependenceAssessment={independentGroups:readonly {groupId:string;evidenceRefs:readonly string[];sourceFamilyIds:readonly string[]}[];independentGroupCount:number;status:"independence_not_truth"};

const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_independence_"+k);return v.trim();};
export function assessEvidenceIndependence(input:readonly IndependenceEvidence[]):IndependenceAssessment{
 const rows=input.map(r=>({evidenceRef:req(r.evidenceRef,"evidence_ref"),sourceId:req(r.sourceId,"source_id"),sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),derivesFromEvidenceRefs:[...new Set(r.derivesFromEvidenceRefs.map(x=>req(x,"derivation_ref")))].sort()}));
 if(new Set(rows.map(r=>r.evidenceRef)).size!==rows.length)throw Error("duplicate_independence_evidence_ref");
 const known=new Set(rows.map(r=>r.evidenceRef)),parent=new Map(rows.map(r=>[r.evidenceRef,r.evidenceRef]));
 const find=(x:string):string=>{let p=parent.get(x)!;while(parent.get(p)!==p)p=parent.get(p)!;return p;};
 const union=(a:string,b:string)=>{const A=find(a),B=find(b);if(A!==B)parent.set(B,A);};
 const byFamily=new Map<string,string>();
 for(const r of rows){const p=byFamily.get(r.sourceFamilyId);if(p)union(r.evidenceRef,p);else byFamily.set(r.sourceFamilyId,r.evidenceRef);for(const d of r.derivesFromEvidenceRefs)if(known.has(d))union(r.evidenceRef,d);}
 const groups=new Map<string,typeof rows>();for(const r of rows){const root=find(r.evidenceRef);groups.set(root,[...(groups.get(root)??[]),r]);}
 const independentGroups=[...groups.values()].map(g=>({groupId:"independence:"+g.map(x=>x.evidenceRef).sort().join("|"),evidenceRefs:g.map(x=>x.evidenceRef).sort(),sourceFamilyIds:[...new Set(g.map(x=>x.sourceFamilyId))].sort()})).sort((a,b)=>a.groupId.localeCompare(b.groupId));
 return {independentGroups,independentGroupCount:independentGroups.length,status:"independence_not_truth"};
}
