export type RedactionBox = { x:number;y:number;width:number;height:number;pageWidth:number;pageHeight:number };
export type ReleasePage = {
  pageId:string;
  physicalPage:number;
  batesNumber:number|null;
  exactSha256:string;
  normalizedTextSha256:string;
  redactions:readonly RedactionBox[];
  attachmentRefs:readonly string[];
};
export type ReleaseSnapshot = { releaseId:string; publishedAtUtc:string; pages:readonly ReleasePage[] };
export type ReleaseDelta = {
  addedPageIds:readonly string[];
  removedPageIds:readonly string[];
  changedPageIds:readonly string[];
  reorderedPageIds:readonly string[];
  newlyReferencedAttachmentIds:readonly string[];
  missingBatesNumbers:readonly number[];
  redactionChanges:readonly {
    pageId:string;
    priorCount:number;
    currentCount:number;
    geometrySimilarity:number;
  }[];
};

const t=(v:unknown,k:string):string=>{if(typeof v!=="string"||!v.trim())throw new Error("invalid_"+k);return v.trim();};
const sha=(v:string):string=>{const x=t(v,"sha256").toLowerCase();if(!/^[a-f0-9]{64}$/.test(x))throw new Error("invalid_sha256");return x;};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

function boxValid(box:RedactionBox):boolean{
  return [box.x,box.y,box.width,box.height,box.pageWidth,box.pageHeight].every(Number.isFinite)&&
    box.pageWidth>0&&box.pageHeight>0&&box.width>0&&box.height>0&&box.x>=0&&box.y>=0&&
    box.x+box.width<=box.pageWidth&&box.y+box.height<=box.pageHeight;
}
function normalizedBox(box:RedactionBox){
  if(!boxValid(box))throw new Error("invalid_redaction_box");
  return {x:box.x/box.pageWidth,y:box.y/box.pageHeight,w:box.width/box.pageWidth,h:box.height/box.pageHeight};
}
function intersectionOverUnion(a:RedactionBox,b:RedactionBox):number{
  const A=normalizedBox(a),B=normalizedBox(b);
  const x1=Math.max(A.x,B.x),y1=Math.max(A.y,B.y),x2=Math.min(A.x+A.w,B.x+B.w),y2=Math.min(A.y+A.h,B.y+B.h);
  const inter=Math.max(0,x2-x1)*Math.max(0,y2-y1);
  const union=A.w*A.h+B.w*B.h-inter;
  return union>0?clamp(inter/union):0;
}
/** Geometry similarity is only a candidate signal; it never resolves hidden text. */
export function redactionGeometrySimilarity(left:readonly RedactionBox[],right:readonly RedactionBox[]):number{
  if(!left.length&&!right.length)return 1;
  if(!left.length||!right.length)return 0;
  const used=new Set<number>();let total=0;
  for(const box of left){
    let best=0,bestIndex=-1;
    right.forEach((candidate,index)=>{if(used.has(index))return;const score=intersectionOverUnion(box,candidate);if(score>best){best=score;bestIndex=index;}});
    if(bestIndex>=0)used.add(bestIndex);
    total+=best;
  }
  return total/Math.max(left.length,right.length);
}
function validatePage(page:ReleasePage):ReleasePage{
  const pageId=t(page.pageId,"page_id");
  if(!Number.isSafeInteger(page.physicalPage)||page.physicalPage<1)throw new Error("invalid_physical_page");
  if(page.batesNumber!==null&&(!Number.isSafeInteger(page.batesNumber)||page.batesNumber<0))throw new Error("invalid_bates_number");
  const redactions=page.redactions.map(box=>{normalizedBox(box);return {...box};});
  const attachmentRefs=page.attachmentRefs.map(v=>t(v,"attachment_ref"));
  return {...page,pageId,exactSha256:sha(page.exactSha256),normalizedTextSha256:sha(page.normalizedTextSha256),redactions,attachmentRefs};
}
function validateSnapshot(snapshot:ReleaseSnapshot):ReleaseSnapshot{
  const releaseId=t(snapshot.releaseId,"release_id");
  const publishedAtUtc=t(snapshot.publishedAtUtc,"published_at_utc");
  if(!Number.isFinite(Date.parse(publishedAtUtc)))throw new Error("invalid_published_at_utc");
  const pages=snapshot.pages.map(validatePage);
  if(new Set(pages.map(p=>p.pageId)).size!==pages.length)throw new Error("duplicate_release_page_id");
  if(new Set(pages.map(p=>p.physicalPage)).size!==pages.length)throw new Error("duplicate_release_physical_page");
  return {releaseId,publishedAtUtc,pages};
}
export function compareReleaseSnapshots(priorInput:ReleaseSnapshot,currentInput:ReleaseSnapshot):ReleaseDelta{
  const prior=validateSnapshot(priorInput),current=validateSnapshot(currentInput);
  if(prior.releaseId===current.releaseId)throw new Error("release_delta_requires_distinct_versions");
  const a=new Map(prior.pages.map(p=>[p.pageId,p])),b=new Map(current.pages.map(p=>[p.pageId,p]));
  const added=[...b.keys()].filter(id=>!a.has(id)).sort();
  const removed=[...a.keys()].filter(id=>!b.has(id)).sort();
  const changed=[...a.keys()].filter(id=>{
    const q=b.get(id);if(!q)return false;const p=a.get(id)!;
    return p.exactSha256!==q.exactSha256||p.normalizedTextSha256!==q.normalizedTextSha256||
      JSON.stringify(p.attachmentRefs)!==JSON.stringify(q.attachmentRefs);
  }).sort();
  const priorOrder=new Map(prior.pages.map((p,i)=>[p.pageId,i]));
  const currentCommon=current.pages.filter(p=>priorOrder.has(p.pageId));
  const reordered=currentCommon.filter((p,i)=>i>0&&priorOrder.get(p.pageId)!<priorOrder.get(currentCommon[i-1].pageId)!)
    .map(p=>p.pageId);
  const priorAttachments=new Set(prior.pages.flatMap(p=>p.attachmentRefs));
  const currentAttachments=new Set(current.pages.flatMap(p=>p.attachmentRefs));
  const newlyReferencedAttachmentIds=[...currentAttachments].filter(x=>!priorAttachments.has(x)).sort();
  const bates=current.pages.map(p=>p.batesNumber).filter((v):v is number=>v!==null).sort((x,y)=>x-y);
  const missingBatesNumbers:number[]=[];
  if(bates.length>1)for(let n=bates[0]+1;n<bates[bates.length-1];n++)if(!bates.includes(n))missingBatesNumbers.push(n);
  const redactionChanges=[...a.keys()].flatMap(pageId=>{
    const q=b.get(pageId);if(!q)return[];const p=a.get(pageId)!;
    const similarity=redactionGeometrySimilarity(p.redactions,q.redactions);
    return (p.redactions.length!==q.redactions.length||similarity<0.999)?[{pageId,priorCount:p.redactions.length,currentCount:q.redactions.length,geometrySimilarity:similarity}]:[];
  });
  return {addedPageIds:added,removedPageIds:removed,changedPageIds:changed,reorderedPageIds:reordered,
    newlyReferencedAttachmentIds,missingBatesNumbers,redactionChanges};
}

export type ExpectedRecordLead={
  leadId:string;
  expectationReason:string;
  expectedRecordKind:string;
  supportingEvidenceRefs:readonly string[];
  observedStatus:"not_observed_in_current_corpus";
};
/** Absence is encoded only as a lead; this function cannot convert absence into evidence of conduct. */
export function createExpectedRecordLead(input:ExpectedRecordLead):ExpectedRecordLead{
  const leadId=t(input.leadId,"lead_id"),reason=t(input.expectationReason,"expectation_reason"),
    kind=t(input.expectedRecordKind,"expected_record_kind");
  const refs=input.supportingEvidenceRefs.map(v=>t(v,"supporting_evidence_ref"));
  if(!refs.length)throw new Error("expected_record_requires_support");
  return {leadId,expectationReason:reason,expectedRecordKind:kind,supportingEvidenceRefs:[...new Set(refs)],
    observedStatus:"not_observed_in_current_corpus"};
}
