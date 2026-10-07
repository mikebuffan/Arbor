import {describe,expect,it} from "vitest";
import {audioQuoteWindow,audioTranscriptSourceIndependence,bindDerivedAudioTranscript,type OriginalAudioEvidence} from "./audioEvidence";

const audio:OriginalAudioEvidence={
  audioRef:"audio-controlled-call-1",
  sourceFamilyId:"family-pbpd-controlled-call-1",
  sourceUri:"evidence://controlled-call-1",
  fileSha256:"a".repeat(64),
  mimeType:"audio/wav",
  durationMs:120000,
  capturedAtUtc:"2005-04-05T15:00:00Z",
};

function transcript(ref="tx-1",hash="b".repeat(64)){
  return {
    transcriptRef:ref,audioRef:audio.audioRef,sourceFamilyId:audio.sourceFamilyId,transcriptSha256:hash,
    producedAtUtc:"2026-10-07T04:00:00Z",producer:"transcription-pass-1",language:"en",supersedesTranscriptRef:null,
    segments:[
      {segmentId:"s1",startMs:1000,endMs:4000,text:"Hello",speakerLabel:"speaker-1",speakerStatus:"candidate" as const,
        resolvedEntityId:null,attributionEvidenceRefs:["voice-label-only"]},
      {segmentId:"s2",startMs:5000,endMs:9000,text:"Second segment",speakerLabel:"speaker-2",speakerStatus:"unknown" as const,
        resolvedEntityId:null,attributionEvidenceRefs:[]},
    ],
  };
}

describe("audio evidence provenance",()=>{
  it("binds transcript as derived evidence without creating independent corroboration",()=>{
    const {transcript:tx,receipt}=bindDerivedAudioTranscript({audio,transcript:transcript()});
    expect(tx.status).toBe("derived_transcript_not_independent_source");
    expect(receipt.independentCorroboration).toBe(false);
    expect(receipt.originalAudioControls).toBe(true);
  });

  it("rejects a transcript attached to another audio source family",()=>{
    const t={...transcript(),sourceFamilyId:"other-family"};
    expect(()=>bindDerivedAudioTranscript({audio,transcript:t})).toThrow("audio_transcript_family_mismatch");
  });

  it("rejects transcript segments outside the original recording duration",()=>{
    const t=transcript();
    t.segments=[{...t.segments[0],endMs:120001}];
    expect(()=>bindDerivedAudioTranscript({audio,transcript:t})).toThrow("invalid_audio_segment_range");
  });

  it("does not silently resolve a speaker identity",()=>{
    const t=transcript();
    t.segments=[{...t.segments[0],speakerStatus:"candidate" as const,resolvedEntityId:"person-1"}];
    expect(()=>bindDerivedAudioTranscript({audio,transcript:t})).toThrow("unresolved_audio_speaker_cannot_merge_entity");
  });

  it("requires evidence references before a speaker can be resolved",()=>{
    const t=transcript();
    t.segments=[{...t.segments[0],speakerStatus:"resolved" as const,resolvedEntityId:"person-1",attributionEvidenceRefs:[]}];
    expect(()=>bindDerivedAudioTranscript({audio,transcript:t})).toThrow("resolved_audio_speaker_requires_evidence");
  });

  it("maps a transcript quote back to the original audio time window",()=>{
    const {transcript:tx}=bindDerivedAudioTranscript({audio,transcript:transcript()});
    const window=audioQuoteWindow({audio,transcript:tx,segmentIds:["s1","s2"]});
    expect(window.startMs).toBe(1000);
    expect(window.endMs).toBe(9000);
    expect(window.status).toBe("derived_quote_window_requires_audio_review");
  });

  it("multiple transcripts of one recording remain one source family",()=>{
    const a=bindDerivedAudioTranscript({audio,transcript:transcript("tx-1","b".repeat(64))}).transcript;
    const b=bindDerivedAudioTranscript({audio,transcript:{...transcript("tx-2","c".repeat(64)),producer:"transcription-pass-2"}}).transcript;
    const result=audioTranscriptSourceIndependence({audio,transcripts:[a,b]});
    expect(result.independentSourceCount).toBe(1);
    expect(result.transcriptCount).toBe(2);
    expect(result.status).toBe("transcripts_do_not_multiply_sources");
  });
});
