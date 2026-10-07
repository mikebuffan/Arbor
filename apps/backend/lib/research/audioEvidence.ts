export type AudioSpeakerStatus="unknown"|"candidate"|"resolved"|"rejected";

export type OriginalAudioEvidence={
  audioRef:string;
  sourceFamilyId:string;
  sourceUri:string;
  fileSha256:string;
  mimeType:string;
  durationMs:number;
  capturedAtUtc:string|null;
};

export type AudioTranscriptSegment={
  segmentId:string;
  startMs:number;
  endMs:number;
  text:string;
  speakerLabel:string|null;
  speakerStatus:AudioSpeakerStatus;
  resolvedEntityId:string|null;
  attributionEvidenceRefs:readonly string[];
};

export type DerivedAudioTranscript={
  transcriptRef:string;
  audioRef:string;
  sourceFamilyId:string;
  transcriptSha256:string;
  producedAtUtc:string;
  producer:string;
  language:string|null;
  segments:readonly AudioTranscriptSegment[];
  supersedesTranscriptRef:string|null;
  status:"derived_transcript_not_independent_source";
};

export type AudioTranscriptReceipt={
  audioRef:string;
  transcriptRef:string;
  sourceFamilyId:string;
  independentCorroboration:false;
  transcriptIsDerived:true;
  originalAudioControls:true;
  segmentCount:number;
  status:"audio_provenance_bound";
};

const req=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_audio_"+k);
  return v.trim();
};
const opt=(v:string|null,k:string,max=1000)=>v===null?null:req(v,k,max);
const utc=(v:string|null,k:string)=>{
  if(v===null)return null;
  const x=req(v,k,100);
  if(!Number.isFinite(Date.parse(x)))throw new Error("invalid_audio_"+k);
  return x;
};
const sha=(v:string,k:string)=>{
  const x=req(v,k,64).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(x))throw new Error("invalid_audio_"+k);
  return x;
};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();

export function validateOriginalAudio(input:OriginalAudioEvidence):OriginalAudioEvidence{
  const audioRef=req(input.audioRef,"ref");
  const sourceFamilyId=req(input.sourceFamilyId,"source_family_id");
  const sourceUri=req(input.sourceUri,"source_uri");
  const fileSha256=sha(input.fileSha256,"file_sha256");
  const mimeType=req(input.mimeType,"mime_type",200);
  if(!Number.isSafeInteger(input.durationMs)||input.durationMs<1)throw new Error("invalid_audio_duration_ms");
  return {audioRef,sourceFamilyId,sourceUri,fileSha256,mimeType,durationMs:input.durationMs,
    capturedAtUtc:utc(input.capturedAtUtc,"captured_at")};
}

export function bindDerivedAudioTranscript(input:{
  audio:OriginalAudioEvidence;
  transcript:Omit<DerivedAudioTranscript,"status">;
}):{transcript:DerivedAudioTranscript;receipt:AudioTranscriptReceipt}{
  const audio=validateOriginalAudio(input.audio);
  const t=input.transcript;
  const transcriptRef=req(t.transcriptRef,"transcript_ref");
  const audioRef=req(t.audioRef,"transcript_audio_ref");
  if(audioRef!==audio.audioRef)throw new Error("audio_transcript_source_mismatch");
  const sourceFamilyId=req(t.sourceFamilyId,"transcript_source_family");
  if(sourceFamilyId!==audio.sourceFamilyId)throw new Error("audio_transcript_family_mismatch");
  const transcriptSha256=sha(t.transcriptSha256,"transcript_sha256");
  const producedAtUtc=utc(req(t.producedAtUtc,"produced_at",100),"produced_at")!;
  const producer=req(t.producer,"producer",400);
  const language=opt(t.language,"language",100);
  const supersedesTranscriptRef=opt(t.supersedesTranscriptRef,"supersedes_transcript_ref",500);
  if(supersedesTranscriptRef===transcriptRef)throw new Error("audio_transcript_cannot_supersede_self");
  const seen=new Set<string>();
  const segments=t.segments.map(segment=>{
    const segmentId=req(segment.segmentId,"segment_id");
    if(seen.has(segmentId))throw new Error("duplicate_audio_segment_id");
    seen.add(segmentId);
    if(!Number.isSafeInteger(segment.startMs)||!Number.isSafeInteger(segment.endMs)||
      segment.startMs<0||segment.endMs<=segment.startMs||segment.endMs>audio.durationMs)
      throw new Error("invalid_audio_segment_range");
    const speakerLabel=opt(segment.speakerLabel,"speaker_label",400);
    if(!["unknown","candidate","resolved","rejected"].includes(segment.speakerStatus))
      throw new Error("invalid_audio_speaker_status");
    const resolvedEntityId=opt(segment.resolvedEntityId,"resolved_entity_id",500);
    const attributionEvidenceRefs=uniq(segment.attributionEvidenceRefs.map(x=>req(x,"attribution_evidence_ref",1000)));
    if(segment.speakerStatus==="resolved"&&(!resolvedEntityId||!attributionEvidenceRefs.length))
      throw new Error("resolved_audio_speaker_requires_evidence");
    if(segment.speakerStatus!=="resolved"&&resolvedEntityId!==null)
      throw new Error("unresolved_audio_speaker_cannot_merge_entity");
    return {segmentId,startMs:segment.startMs,endMs:segment.endMs,text:req(segment.text,"segment_text",20000),
      speakerLabel,speakerStatus:segment.speakerStatus,resolvedEntityId,attributionEvidenceRefs};
  });
  const transcript:DerivedAudioTranscript={transcriptRef,audioRef,sourceFamilyId,transcriptSha256,producedAtUtc,
    producer,language,segments,supersedesTranscriptRef,status:"derived_transcript_not_independent_source"};
  return {transcript,receipt:{audioRef,transcriptRef,sourceFamilyId,independentCorroboration:false,
    transcriptIsDerived:true,originalAudioControls:true,segmentCount:segments.length,status:"audio_provenance_bound"}};
}

export function audioQuoteWindow(input:{
  audio:OriginalAudioEvidence;
  transcript:DerivedAudioTranscript;
  segmentIds:readonly string[];
}):{audioRef:string;sourceFamilyId:string;startMs:number;endMs:number;segmentIds:readonly string[];status:"derived_quote_window_requires_audio_review"}{
  const audio=validateOriginalAudio(input.audio);
  if(input.transcript.audioRef!==audio.audioRef||input.transcript.sourceFamilyId!==audio.sourceFamilyId)
    throw new Error("audio_quote_source_mismatch");
  const ids=uniq(input.segmentIds.map(x=>req(x,"quote_segment_id",500)));
  if(!ids.length)throw new Error("audio_quote_segment_required");
  const byId=new Map(input.transcript.segments.map(s=>[s.segmentId,s]));
  const segments=ids.map(id=>{const s=byId.get(id);if(!s)throw new Error("audio_quote_unknown_segment");return s;});
  return {audioRef:audio.audioRef,sourceFamilyId:audio.sourceFamilyId,startMs:Math.min(...segments.map(s=>s.startMs)),
    endMs:Math.max(...segments.map(s=>s.endMs)),segmentIds:ids,status:"derived_quote_window_requires_audio_review"};
}

export function audioTranscriptSourceIndependence(input:{
  audio:OriginalAudioEvidence;
  transcripts:readonly DerivedAudioTranscript[];
}):{sourceFamilyId:string;independentSourceCount:1;transcriptCount:number;status:"transcripts_do_not_multiply_sources"}{
  const audio=validateOriginalAudio(input.audio);
  for(const t of input.transcripts)
    if(t.audioRef!==audio.audioRef||t.sourceFamilyId!==audio.sourceFamilyId)
      throw new Error("audio_independence_family_mismatch");
  return {sourceFamilyId:audio.sourceFamilyId,independentSourceCount:1,transcriptCount:input.transcripts.length,
    status:"transcripts_do_not_multiply_sources"};
}
