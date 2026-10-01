export type VisualAssetKind="photograph"|"map"|"screenshot"|"scan"|"diagram"|"other";

export type VisualEvidenceAsset={
  assetId:string;
  kind:VisualAssetKind;
  documentId:string;
  physicalPage:number|null;
  originalBytesSha256:string;
  imageBytesSha256:string;
  sourceRefs:readonly string[];
  exhibitLabel:string|null;
  captionText:string|null;
  createdAtUtc:string|null;
  linkedTestimonyRefs:readonly string[];
  reviewStatus:"hold_for_visual_source_and_privacy_review";
};

export type VisualObservation={
  observationId:string;
  assetId:string;
  literalObservation:string;
  sourceRegion:{x:number;y:number;width:number;height:number}|null;
  reviewerRef:string;
  observedAtUtc:string;
  status:"literal_visual_observation_only";
};

const req=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_visual_"+k);
  return v.trim();
};
const sha=(v:string,k:string):string=>{
  const x=req(v,k,64).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(x))throw new Error("invalid_visual_"+k);
  return x;
};
const opt=(v:string|null,k:string,max=1000)=>v===null?null:req(v,k,max);
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k,800)))].sort();

export function createVisualEvidenceAsset(input:VisualEvidenceAsset):VisualEvidenceAsset{
  if(!["photograph","map","screenshot","scan","diagram","other"].includes(input.kind))
    throw new Error("invalid_visual_kind");
  const assetId=req(input.assetId,"asset_id");
  const documentId=req(input.documentId,"document_id");
  const physicalPage=input.physicalPage;
  if(physicalPage!==null&&(!Number.isSafeInteger(physicalPage)||physicalPage<1))throw new Error("invalid_visual_physical_page");
  const originalBytesSha256=sha(input.originalBytesSha256,"original_sha256");
  const imageBytesSha256=sha(input.imageBytesSha256,"image_sha256");
  const sourceRefs=uniq(input.sourceRefs,"source_ref");
  if(!sourceRefs.length)throw new Error("visual_source_ref_required");
  const createdAtUtc=input.createdAtUtc===null?null:req(input.createdAtUtc,"created_at",100);
  if(createdAtUtc!==null&&!Number.isFinite(Date.parse(createdAtUtc)))throw new Error("invalid_visual_created_at");
  return {assetId,kind:input.kind,documentId,physicalPage,originalBytesSha256,imageBytesSha256,sourceRefs,
    exhibitLabel:opt(input.exhibitLabel,"exhibit_label",300),captionText:opt(input.captionText,"caption_text",4000),
    createdAtUtc,linkedTestimonyRefs:uniq(input.linkedTestimonyRefs,"testimony_ref"),
    reviewStatus:"hold_for_visual_source_and_privacy_review"};
}

export function createLiteralVisualObservation(input:VisualObservation):VisualObservation{
  const observationId=req(input.observationId,"observation_id");
  const assetId=req(input.assetId,"asset_id");
  const literalObservation=req(input.literalObservation,"literal_observation",4000);
  const reviewerRef=req(input.reviewerRef,"reviewer_ref",200);
  const observedAtUtc=req(input.observedAtUtc,"observed_at",100);
  if(!Number.isFinite(Date.parse(observedAtUtc)))throw new Error("invalid_visual_observed_at");
  let sourceRegion=input.sourceRegion;
  if(sourceRegion){
    if(![sourceRegion.x,sourceRegion.y,sourceRegion.width,sourceRegion.height].every(Number.isFinite)||
       sourceRegion.x<0||sourceRegion.y<0||sourceRegion.width<=0||sourceRegion.height<=0)
      throw new Error("invalid_visual_source_region");
    sourceRegion={...sourceRegion};
  }
  return {observationId,assetId,literalObservation,sourceRegion,reviewerRef,observedAtUtc,
    status:"literal_visual_observation_only"};
}

/** Explicitly excludes biometric or identity inference. */
export function assertNoBiometricInference(observation:VisualObservation):void{
  const banned=/(face match|facial recognition|same person|identity match|looks like|appears to be)/i;
  if(banned.test(observation.literalObservation))throw new Error("visual_identity_inference_not_allowed");
}
