import type { PdfPageImageReceipt } from "./pdfPageImageProvenance";

export type OcrSourceKind = "printed" | "handwritten" | "mixed" | "unknown";
export type OcrBox = { x:number; y:number; width:number; height:number };
export type OcrToken = {
  tokenId:string;
  text:string;
  confidence:number|null;
  box:OcrBox;
};
export type OcrEngineOutput = {
  engine:string;
  engineVersion:string;
  pagePixelWidth:number;
  pagePixelHeight:number;
  sourceKind:OcrSourceKind;
  tokens:readonly OcrToken[];
};

export type OcrPageReceipt = {
  documentId:string;
  physicalPdfPage:number;
  originalBytesSha256:string;
  imageBytesSha256:string;
  engine:string;
  engineVersion:string;
  pagePixelWidth:number;
  pagePixelHeight:number;
  sourceKind:OcrSourceKind;
  tokens:readonly OcrToken[];
  extractedText:string;
  meanConfidence:number|null;
  reviewStatus:"hold_for_human_ocr_and_original_image_review";
};

export type OcrHumanReview = {
  ocrReceipt:OcrPageReceipt;
  reviewerRef:string;
  reviewedAtUtc:string;
  decision:"accepted_as_transcription_candidate"|"rejected"|"corrected";
  correctedText:string|null;
  correctionNotes:string|null;
  status:"hold_for_independent_source_and_privacy_review";
};

const text=(v:unknown,k:string,max=10000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_ocr_"+k);
  return v.trim();
};
const utc=(v:string):boolean=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString()===v;

function validateBox(box:OcrBox,w:number,h:number):OcrBox{
  if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||
     box.x<0||box.y<0||box.width<=0||box.height<=0||
     box.x+box.width>w||box.y+box.height>h) throw new Error("invalid_ocr_box");
  return {...box};
}

/**
 * The engine is injected and must operate on the already-rendered page image.
 * This function never fetches a source, never replaces text-layer extraction,
 * and never clears output for publication.
 */
export async function runOptInOcr(input:{
  image:PdfPageImageReceipt;
  pngBytes:Uint8Array;
  authorizedOptIn:true;
  engine:(bytes:Uint8Array)=>Promise<OcrEngineOutput>;
}):Promise<OcrPageReceipt>{
  if(input.authorizedOptIn!==true)throw new Error("ocr_opt_in_required");
  if(!(input.pngBytes instanceof Uint8Array)||input.pngBytes.byteLength!==input.image.imageByteLength)
    throw new Error("ocr_image_byte_length_mismatch");

  const copy=new Uint8Array(input.pngBytes.byteLength);copy.set(input.pngBytes);
  const digest=await crypto.subtle.digest("SHA-256",copy.buffer);
  const imageHash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  if(imageHash!==input.image.imageBytesSha256)throw new Error("ocr_image_hash_mismatch");

  const output=await input.engine(copy);
  const engine=text(output.engine,"engine",120),engineVersion=text(output.engineVersion,"engine_version",120);
  if(!Number.isSafeInteger(output.pagePixelWidth)||output.pagePixelWidth<1||output.pagePixelWidth>20000||
     !Number.isSafeInteger(output.pagePixelHeight)||output.pagePixelHeight<1||output.pagePixelHeight>20000)
    throw new Error("invalid_ocr_page_dimensions");
  if(!["printed","handwritten","mixed","unknown"].includes(output.sourceKind))throw new Error("invalid_ocr_source_kind");
  if(!Array.isArray(output.tokens)||output.tokens.length>100000)throw new Error("invalid_ocr_tokens");

  const seen=new Set<string>();
  const tokens=output.tokens.map(token=>{
    const tokenId=text(token.tokenId,"token_id",200);
    if(seen.has(tokenId))throw new Error("duplicate_ocr_token_id");seen.add(tokenId);
    const tokenText=text(token.text,"token_text",2000);
    if(token.confidence!==null&&(!Number.isFinite(token.confidence)||token.confidence<0||token.confidence>1))
      throw new Error("invalid_ocr_confidence");
    return {tokenId,text:tokenText,confidence:token.confidence,
      box:validateBox(token.box,output.pagePixelWidth,output.pagePixelHeight)};
  });
  const extractedText=tokens.map(t=>t.text).join(" ");
  const confidences=tokens.map(t=>t.confidence).filter((v):v is number=>v!==null);
  return {
    documentId:input.image.documentId,
    physicalPdfPage:input.image.physicalPdfPage,
    originalBytesSha256:input.image.originalBytesSha256,
    imageBytesSha256:input.image.imageBytesSha256,
    engine,engineVersion,pagePixelWidth:output.pagePixelWidth,pagePixelHeight:output.pagePixelHeight,
    sourceKind:output.sourceKind,tokens,extractedText,
    meanConfidence:confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:null,
    reviewStatus:"hold_for_human_ocr_and_original_image_review",
  };
}

export function reviewOcrReceipt(input:{
  receipt:OcrPageReceipt;
  reviewerRef:string;
  reviewedAtUtc:string;
  decision:OcrHumanReview["decision"];
  correctedText?:string|null;
  correctionNotes?:string|null;
}):OcrHumanReview{
  const reviewerRef=text(input.reviewerRef,"reviewer_ref",160);
  if(!utc(input.reviewedAtUtc))throw new Error("invalid_ocr_reviewed_at");
  if(!["accepted_as_transcription_candidate","rejected","corrected"].includes(input.decision))
    throw new Error("invalid_ocr_review_decision");
  const correctedText=input.correctedText==null?null:text(input.correctedText,"corrected_text",200000);
  const correctionNotes=input.correctionNotes==null?null:text(input.correctionNotes,"correction_notes",4000);
  if(input.decision==="corrected"&&correctedText===null)throw new Error("ocr_correction_text_required");
  if(input.decision!=="corrected"&&correctedText!==null)throw new Error("unexpected_ocr_correction_text");
  return {ocrReceipt:input.receipt,reviewerRef,reviewedAtUtc:input.reviewedAtUtc,
    decision:input.decision,correctedText,correctionNotes,
    status:"hold_for_independent_source_and_privacy_review"};
}
