export type EvidencePacketSource={
  evidenceRef:string;
  sourceRef:string;
  documentId:string;
  physicalPage:number|null;
  originalBytesSha256:string;
  pageHash:string|null;
  highlightedText:string|null;
  role:"support"|"counterevidence"|"context";
};

export type EvidencePacket={
  packetId:string;
  findingRef:string;
  title:string;
  replayRecipeSha256:string;
  sources:readonly EvidencePacketSource[];
  limitations:readonly string[];
  unresolvedQuestions:readonly string[];
  privacyFlagIds:readonly string[];
  originalPageReviewComplete:boolean;
  status:"hold_for_human_evidence_packet_review";
};

const req=(v:unknown,k:string,max=12000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_packet_"+k);
  return v.trim();
};
const sha=(v:string,k:string)=>{const x=req(v,k,64).toLowerCase();if(!/^[a-f0-9]{64}$/.test(x))throw new Error("invalid_packet_"+k);return x;};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k,3000)))];

export function buildEvidencePacket(input:EvidencePacket):EvidencePacket{
  const packetId=req(input.packetId,"packet_id");
  const findingRef=req(input.findingRef,"finding_ref");
  const title=req(input.title,"title",500);
  const replayRecipeSha256=sha(input.replayRecipeSha256,"replay_sha256");
  if(!Array.isArray(input.sources)||!input.sources.length)throw new Error("evidence_packet_source_required");
  const sources=input.sources.map(s=>({
    evidenceRef:req(s.evidenceRef,"evidence_ref"),
    sourceRef:req(s.sourceRef,"source_ref"),
    documentId:req(s.documentId,"document_id"),
    physicalPage:s.physicalPage,
    originalBytesSha256:sha(s.originalBytesSha256,"original_sha256"),
    pageHash:s.pageHash===null?null:sha(s.pageHash,"page_hash"),
    highlightedText:s.highlightedText===null?null:req(s.highlightedText,"highlighted_text",20000),
    role:s.role,
  }));
  for(const source of sources){
    if(!["support","counterevidence","context"].includes(source.role))throw new Error("invalid_packet_source_role");
    if(source.physicalPage!==null&&(!Number.isSafeInteger(source.physicalPage)||source.physicalPage<1))
      throw new Error("invalid_packet_physical_page");
  }
  if(new Set(sources.map(s=>s.evidenceRef+"|"+s.sourceRef)).size!==sources.length)
    throw new Error("duplicate_packet_source");

  return {packetId,findingRef,title,replayRecipeSha256,sources,
    limitations:uniq(input.limitations,"limitation"),
    unresolvedQuestions:uniq(input.unresolvedQuestions,"unresolved_question"),
    privacyFlagIds:uniq(input.privacyFlagIds,"privacy_flag_id"),
    originalPageReviewComplete:input.originalPageReviewComplete===true,
    status:"hold_for_human_evidence_packet_review"};
}

export function packetReleaseReadiness(packetInput:EvidencePacket):{
  readyForHumanReleaseDecision:boolean;
  holdReasons:readonly string[];
}{
  const packet=buildEvidencePacket(packetInput);
  const holdReasons:string[]=[];
  if(!packet.originalPageReviewComplete)holdReasons.push("original_page_review_incomplete");
  if(packet.privacyFlagIds.length)holdReasons.push("privacy_flags_unresolved");
  if(packet.unresolvedQuestions.length)holdReasons.push("unresolved_questions_present");
  if(!packet.sources.some(s=>s.role==="counterevidence"))holdReasons.push("counterevidence_not_in_packet");
  return {readyForHumanReleaseDecision:holdReasons.length===0,holdReasons};
}
