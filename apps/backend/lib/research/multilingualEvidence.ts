export type TranslationSegment={
  segmentId:string;
  sourceText:string;
  translatedText:string;
  sourceLanguage:string;
  targetLanguage:string;
  sourceRef:string;
  sourceStartUtf16:number;
  sourceEndUtf16:number;
  translator:string;
  translatorVersion:string|null;
  machineConfidence:number|null;
  ambiguityNotes:readonly string[];
  humanReviewStatus:"unreviewed"|"reviewed"|"corrected";
};
export type MultilingualEvidenceRecord={
  recordId:string;
  documentId:string;
  sourceLanguage:string;
  originalText:string;
  segments:readonly TranslationSegment[];
  status:"original_preserved_translation_secondary";
};
const req=(v:unknown,k:string,max=20000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_translation_"+k);
  return v.trim();
};
export function createMultilingualEvidenceRecord(input:MultilingualEvidenceRecord):MultilingualEvidenceRecord{
  const recordId=req(input.recordId,"record_id");
  const documentId=req(input.documentId,"document_id");
  const sourceLanguage=req(input.sourceLanguage,"source_language",80);
  const originalText=req(input.originalText,"original_text",500000);
  const segments=input.segments.map(s=>{
    const segmentId=req(s.segmentId,"segment_id");
    const sourceText=req(s.sourceText,"source_text",50000);
    const translatedText=req(s.translatedText,"translated_text",50000);
    const sourceRef=req(s.sourceRef,"source_ref",1000);
    const translator=req(s.translator,"translator",300);
    const translatorVersion=s.translatorVersion===null?null:req(s.translatorVersion,"translator_version",300);
    if(!Number.isSafeInteger(s.sourceStartUtf16)||!Number.isSafeInteger(s.sourceEndUtf16)||
       s.sourceStartUtf16<0||s.sourceEndUtf16<=s.sourceStartUtf16||s.sourceEndUtf16>originalText.length)
      throw new Error("invalid_translation_source_span");
    if(originalText.slice(s.sourceStartUtf16,s.sourceEndUtf16)!==sourceText)
      throw new Error("translation_source_span_mismatch");
    if(s.machineConfidence!==null&&(!Number.isFinite(s.machineConfidence)||s.machineConfidence<0||s.machineConfidence>1))
      throw new Error("invalid_translation_confidence");
    if(!["unreviewed","reviewed","corrected"].includes(s.humanReviewStatus))throw new Error("invalid_translation_review_status");
    return {...s,segmentId,sourceText,translatedText,sourceRef,translator,translatorVersion,
      ambiguityNotes:[...new Set(s.ambiguityNotes.map(x=>req(x,"ambiguity_note",4000)))]};
  });
  if(new Set(segments.map(s=>s.segmentId)).size!==segments.length)throw new Error("duplicate_translation_segment_id");
  return {recordId,documentId,sourceLanguage,originalText,segments,
    status:"original_preserved_translation_secondary"};
}
