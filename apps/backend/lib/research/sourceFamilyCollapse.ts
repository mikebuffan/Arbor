import {
  compareOriginalSources,
  originalSourceIdentity,
  type OriginalSourceIdentity,
} from "./sourceVersion";

export type SourceFamilyRecord={
  recordId:string;
  source:OriginalSourceIdentity;
  upstreamRecordIds:readonly string[];
};

export type CollapsedSourceFamily={
  familyId:string;
  recordIds:readonly string[];
  contentVersionKeys:readonly string[];
  sourceLocationKeys:readonly string[];
  linkReasons:readonly ("same_content"|"same_location_version"|"shared_upstream")[];
  unresolvedUpstreamRecordIds:readonly string[];
  status:"conservative_source_family_not_independence";
};

export type SourceFamilyCollapse={
  families:readonly CollapsedSourceFamily[];
  recordToFamily:Readonly<Record<string,string>>;
  unresolvedUpstreamRecordIds:readonly string[];
  status:"family_collapse_not_truth";
};

const req=(v:unknown,k:string,max=1000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_source_family_"+k);
  return v.trim();
};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();

export function collapseSourceFamilies(input:readonly SourceFamilyRecord[]):SourceFamilyCollapse{
  const rows=input.map(r=>({
    recordId:req(r.recordId,"record_id"),
    source:originalSourceIdentity({
      sourceUri:r.source.sourceUri,
      documentId:r.source.documentId,
      originalBytesSha256:r.source.originalBytesSha256,
      originalByteLength:r.source.originalByteLength,
      declaredPageCount:r.source.physicalPdfPageCount,
    }),
    upstreamRecordIds:uniq(r.upstreamRecordIds.map(x=>req(x,"upstream_record_id"))),
  }));
  if(new Set(rows.map(r=>r.recordId)).size!==rows.length)throw new Error("duplicate_source_family_record_id");
  for(const r of rows)if(r.upstreamRecordIds.includes(r.recordId))
    throw new Error("source_family_self_upstream");

  const known=new Set(rows.map(r=>r.recordId));
  const parent=new Map(rows.map(r=>[r.recordId,r.recordId]));
  const find=(id:string):string=>{
    let p=parent.get(id)!;
    while(parent.get(p)!==p)p=parent.get(p)!;
    return p;
  };
  const union=(a:string,b:string)=>{
    const A=find(a),B=find(b);
    if(A!==B)parent.set(B,A);
  };

  const pairReasons=new Map<string,Set<CollapsedSourceFamily["linkReasons"][number]>>();
  const addReason=(a:string,b:string,reason:CollapsedSourceFamily["linkReasons"][number])=>{
    const key=[a,b].sort().join("|");
    const set=pairReasons.get(key)??new Set();
    set.add(reason);pairReasons.set(key,set);union(a,b);
  };

  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];
    const relation=compareOriginalSources(a.source,b.source);
    if(relation==="same_source_version"||relation==="identical_bytes_mirrored_location")
      addReason(a.recordId,b.recordId,"same_content");
    else if(relation==="location_changed_content")
      addReason(a.recordId,b.recordId,"same_location_version");
    if(a.upstreamRecordIds.some(id=>b.upstreamRecordIds.includes(id)))
      addReason(a.recordId,b.recordId,"shared_upstream");
  }

  const groups=new Map<string,typeof rows>();
  for(const r of rows){
    const root=find(r.recordId);
    groups.set(root,[...(groups.get(root)??[]),r]);
  }

  const families=[...groups.values()].map(group=>{
    const recordIds=group.map(r=>r.recordId).sort();
    const memberSet=new Set(recordIds);
    const linkReasons=uniq([...pairReasons.entries()]
      .filter(([key])=>key.split("|").every(id=>memberSet.has(id)))
      .flatMap(([,reasons])=>[...reasons])) as CollapsedSourceFamily["linkReasons"];
    const unresolvedUpstreamRecordIds=uniq(group.flatMap(r=>
      r.upstreamRecordIds.filter(id=>!known.has(id))));
    return {
      familyId:"source-family:"+recordIds.join("|"),
      recordIds,
      contentVersionKeys:uniq(group.map(r=>r.source.contentVersionKey)),
      sourceLocationKeys:uniq(group.map(r=>r.source.sourceLocationKey)),
      linkReasons,
      unresolvedUpstreamRecordIds,
      status:"conservative_source_family_not_independence" as const,
    };
  }).sort((a,b)=>a.familyId.localeCompare(b.familyId));

  const recordToFamily:Record<string,string>={};
  for(const family of families)for(const recordId of family.recordIds)
    recordToFamily[recordId]=family.familyId;

  return {
    families,
    recordToFamily,
    unresolvedUpstreamRecordIds:uniq(families.flatMap(f=>f.unresolvedUpstreamRecordIds)),
    status:"family_collapse_not_truth",
  };
}
