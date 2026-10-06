export type ReviewActionType=
  | "confirm_extraction"|"reject_extraction"|"reject_alias"|"hold_identity"
  | "mark_source_derivative"|"open_roundabout"|"accept_ocr_candidate"
  | "reject_ocr_candidate"|"accept_table_candidate"|"reject_table_candidate"
  | "accept_literal_visual_observation"|"reject_visual_observation";

export type ReviewPacket={
  packetId:string;
  title:string;
  source:{
    documentId:string;
    physicalPage:number;
    originalBytesSha256:string;
    pageHash:string;
    sourceRefs:readonly string[];
  };
  extractedText:string|null;
  ocr:{
    receiptId:string;
    text:string;
    meanConfidence:number|null;
    reviewStatus:string;
  }|null;
  tableCandidates:readonly {
    tableId:string;
    rowCount:number;
    columnCount:number;
    status:string;
  }[];
  identityCandidates:readonly {
    candidateId:string;
    label:string;
    status:"resolved"|"candidate"|"ambiguous"|"rejected";
    basisMentionIds:readonly string[];
  }[];
  contradictions:readonly {
    conflictId:string;
    reason:string;
    evidenceRefs:readonly string[];
  }[];
  releaseVariants:readonly {
    releaseId:string;
    changed:boolean;
    redactionChangeCount:number;
  }[];
  visualAssets:readonly {
    assetId:string;
    kind:string;
    exhibitLabel:string|null;
    reviewStatus:string;
  }[];
  privacyFlagIds:readonly string[];
  publicationStatus:"hold";
};

export type ReviewActionReceipt={
  receiptId:string;
  packetId:string;
  action:ReviewActionType;
  targetRef:string;
  reviewerRef:string;
  rationale:string;
  evidenceRefs:readonly string[];
  createdAtUtc:string;
  status:"recorded_no_source_mutation";
};

const req=(v:unknown,k:string,max=8000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_review_"+k);
  return v.trim();
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k,800)))].sort();

export function validateReviewPacket(packet:ReviewPacket):ReviewPacket{
  const packetId=req(packet.packetId,"packet_id");
  const title=req(packet.title,"title",500);
  const documentId=req(packet.source.documentId,"document_id");
  if(!Number.isSafeInteger(packet.source.physicalPage)||packet.source.physicalPage<1)
    throw new Error("invalid_review_physical_page");
  const originalBytesSha256=req(packet.source.originalBytesSha256,"original_sha",64).toLowerCase();
  const pageHash=req(packet.source.pageHash,"page_hash",64).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(originalBytesSha256)||!/^[a-f0-9]{64}$/.test(pageHash))
    throw new Error("invalid_review_hash");
  const sourceRefs=uniq(packet.source.sourceRefs,"source_ref");
  if(!sourceRefs.length)throw new Error("review_source_ref_required");
  if(packet.publicationStatus!=="hold")throw new Error("review_packet_must_remain_hold");
  return {...packet,packetId,title,source:{...packet.source,documentId,originalBytesSha256,pageHash,sourceRefs}};
}

export function recordReviewAction(input:{
  packet:ReviewPacket;
  receiptId:string;
  action:ReviewActionType;
  targetRef:string;
  reviewerRef:string;
  rationale:string;
  evidenceRefs:readonly string[];
  createdAtUtc:string;
}):ReviewActionReceipt{
  const packet=validateReviewPacket(input.packet);
  const receiptId=req(input.receiptId,"receipt_id");
  if(!["confirm_extraction","reject_extraction","reject_alias","hold_identity","mark_source_derivative",
    "open_roundabout","accept_ocr_candidate","reject_ocr_candidate","accept_table_candidate",
    "reject_table_candidate","accept_literal_visual_observation","reject_visual_observation"].includes(input.action))
    throw new Error("invalid_review_action");
  const targetRef=req(input.targetRef,"target_ref");
  const reviewerRef=req(input.reviewerRef,"reviewer_ref",300);
  const rationale=req(input.rationale,"rationale",4000);
  const evidenceRefs=uniq(input.evidenceRefs,"evidence_ref");
  if(!evidenceRefs.length)throw new Error("review_action_evidence_required");
  const createdAtUtc=req(input.createdAtUtc,"created_at",100);
  if(!Number.isFinite(Date.parse(createdAtUtc)))throw new Error("invalid_review_created_at");
  return {receiptId,packetId:packet.packetId,action:input.action,targetRef,reviewerRef,rationale,evidenceRefs,
    createdAtUtc,status:"recorded_no_source_mutation"};
}

export function reviewPacketStats(packetInput:ReviewPacket){
  const packet=validateReviewPacket(packetInput);
  return {
    identityCandidates:packet.identityCandidates.length,
    unresolvedIdentities:packet.identityCandidates.filter(x=>x.status==="candidate"||x.status==="ambiguous").length,
    contradictions:packet.contradictions.length,
    releaseVariants:packet.releaseVariants.length,
    changedReleaseVariants:packet.releaseVariants.filter(x=>x.changed).length,
    tableCandidates:packet.tableCandidates.length,
    visualAssets:packet.visualAssets.length,
    privacyFlags:packet.privacyFlagIds.length,
    ocrAvailable:packet.ocr!==null,
    publicationStatus:"hold" as const,
  };
}
