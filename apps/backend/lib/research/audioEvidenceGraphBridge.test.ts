import { describe, expect, it } from "vitest";
import {
  bindDerivedAudioTranscript,
  type OriginalAudioEvidence,
} from "./audioEvidence";
import { prepareAudioClaimEvidence } from "./audioEvidenceGraphBridge";
import { summarizeClaimEvidence } from "./claimEvidenceGraph";

const audio: OriginalAudioEvidence = {
  audioRef: "audio:001",
  sourceFamilyId: "family:recording:001",
  sourceUri: "https://example.invalid/source.wav",
  fileSha256: "a".repeat(64),
  mimeType: "audio/wav",
  durationMs: 20_000,
  capturedAtUtc: "2005-01-01T00:00:00Z",
};

function transcript(ref: string, hash: string) {
  return bindDerivedAudioTranscript({
    audio,
    transcript: {
      transcriptRef: ref,
      audioRef: audio.audioRef,
      sourceFamilyId: audio.sourceFamilyId,
      transcriptSha256: hash.repeat(64),
      producedAtUtc: "2026-10-07T05:00:00Z",
      producer: "synthetic-fixture",
      language: "en",
      supersedesTranscriptRef: null,
      segments: [
        {
          segmentId: "s1",
          startMs: 1000,
          endMs: 2500,
          text: "synthetic statement",
          speakerLabel: null,
          speakerStatus: "unknown",
          resolvedEntityId: null,
          attributionEvidenceRefs: [],
        },
      ],
    },
  }).transcript;
}

describe("audio evidence -> existing claim evidence graph", () => {
  it("binds a transcript segment to the original audio source family", () => {
    const prepared = prepareAudioClaimEvidence({
      audio,
      transcript: transcript("transcript:one", "b"),
      bindings: [
        { claimId: "claim:1", segmentId: "s1", direction: "supports" },
      ],
    });

    expect(prepared.status).toBe("prepared_audio_claim_evidence_not_verdict");
    expect(prepared.grantsFinding).toBe(false);
    expect(prepared.independentCorroboration).toBe(false);
    expect(prepared.edges).toHaveLength(1);
    expect(prepared.edges[0].sourceFamilyId).toBe(audio.sourceFamilyId);
    expect(prepared.windows[0]).toMatchObject({
      audioRef: audio.audioRef,
      segmentId: "s1",
      startMs: 1000,
      endMs: 2500,
      status: "derived_quote_window_requires_audio_review",
    });
  });

  it("does not let two transcripts of one recording multiply source families", () => {
    const one = prepareAudioClaimEvidence({
      audio,
      transcript: transcript("transcript:one", "b"),
      bindings: [
        { claimId: "claim:1", segmentId: "s1", direction: "supports" },
      ],
    });
    const two = prepareAudioClaimEvidence({
      audio,
      transcript: transcript("transcript:two", "c"),
      bindings: [
        { claimId: "claim:1", segmentId: "s1", direction: "supports" },
      ],
    });

    const summary = summarizeClaimEvidence([...one.edges, ...two.edges])[0];
    expect(summary.supportRefs).toHaveLength(2);
    expect(summary.supportFamilies).toEqual([audio.sourceFamilyId]);
  });

  it("can enter counterevidence without turning it into a verdict", () => {
    const prepared = prepareAudioClaimEvidence({
      audio,
      transcript: transcript("transcript:counter", "d"),
      bindings: [
        { claimId: "claim:1", segmentId: "s1", direction: "contradicts" },
      ],
    });

    const summary = summarizeClaimEvidence(prepared.edges)[0];
    expect(summary.counterFamilies).toEqual([audio.sourceFamilyId]);
    expect(summary.status).toBe("graph_not_verdict");
    expect(prepared.grantsFinding).toBe(false);
  });

  it("rejects a transcript from another source family", () => {
    const t = {
      ...transcript("transcript:bad", "e"),
      sourceFamilyId: "family:other",
    };

    expect(() =>
      prepareAudioClaimEvidence({
        audio,
        transcript: t,
        bindings: [
          { claimId: "claim:1", segmentId: "s1", direction: "supports" },
        ],
      }),
    ).toThrow("audio_claim_source_mismatch");
  });

  it("rejects duplicate claim-segment-direction bindings", () => {
    const t = transcript("transcript:dup", "f");
    expect(() =>
      prepareAudioClaimEvidence({
        audio,
        transcript: t,
        bindings: [
          { claimId: "claim:1", segmentId: "s1", direction: "supports" },
          { claimId: "claim:1", segmentId: "s1", direction: "supports" },
        ],
      }),
    ).toThrow("duplicate_audio_claim_binding");
  });
});
