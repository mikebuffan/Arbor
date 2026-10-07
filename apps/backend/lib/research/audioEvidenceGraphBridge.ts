import {
  audioQuoteWindow,
  validateOriginalAudio,
  type DerivedAudioTranscript,
  type OriginalAudioEvidence,
} from "./audioEvidence";
import type { ClaimEvidenceEdge } from "./claimEvidenceGraph";

export type AudioClaimBinding = {
  claimId: string;
  segmentId: string;
  direction: ClaimEvidenceEdge["direction"];
};

export type PreparedAudioClaimEvidence = {
  edges: readonly ClaimEvidenceEdge[];
  windows: readonly {
    evidenceRef: string;
    audioRef: string;
    transcriptRef: string;
    segmentId: string;
    startMs: number;
    endMs: number;
    sourceFamilyId: string;
    status: "derived_quote_window_requires_audio_review";
  }[];
  independentCorroboration: false;
  grantsFinding: false;
  status: "prepared_audio_claim_evidence_not_verdict";
};

function req(value: unknown, key: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("invalid_audio_claim_" + key);
  }
  return value.trim();
}

function evidenceRef(input: {
  audioRef: string;
  transcriptRef: string;
  segmentId: string;
  startMs: number;
  endMs: number;
}): string {
  const ref = [
    "audio",
    input.audioRef,
    "window",
    String(input.startMs) + "-" + String(input.endMs),
    "transcript",
    input.transcriptRef,
    "segment",
    input.segmentId,
  ].join(":");

  if (ref.length > 1000) {
    throw new Error("audio_claim_evidence_ref_too_long");
  }
  return ref;
}

/**
 * Source-only adapter from provenance-bound audio transcript segments into the
 * existing Claim <-> Evidence <-> Counterevidence graph.
 *
 * The derived transcript does not become an independent source. Every edge
 * retains the original audio's sourceFamilyId, so alternate transcripts of the
 * same recording cannot multiply corroboration. This prepares graph edges only;
 * it does not promote a finding, resolve a speaker identity, or grant execution.
 */
export function prepareAudioClaimEvidence(input: {
  audio: OriginalAudioEvidence;
  transcript: DerivedAudioTranscript;
  bindings: readonly AudioClaimBinding[];
}): PreparedAudioClaimEvidence {
  const audio = validateOriginalAudio(input.audio);

  if (
    input.transcript.audioRef !== audio.audioRef ||
    input.transcript.sourceFamilyId !== audio.sourceFamilyId
  ) {
    throw new Error("audio_claim_source_mismatch");
  }

  if (input.transcript.status !== "derived_transcript_not_independent_source") {
    throw new Error("audio_claim_requires_derived_transcript_status");
  }

  const bySegment = new Map(
    input.transcript.segments.map(segment => [segment.segmentId, segment]),
  );
  const dedupe = new Set<string>();
  const edges: ClaimEvidenceEdge[] = [];
  const windows: PreparedAudioClaimEvidence["windows"][number][] = [];

  for (const binding of input.bindings) {
    const claimId = req(binding.claimId, "claim_id");
    const segmentId = req(binding.segmentId, "segment_id", 500);
    if (!["supports", "contradicts", "contextualizes"].includes(binding.direction)) {
      throw new Error("invalid_audio_claim_direction");
    }

    const segment = bySegment.get(segmentId);
    if (!segment) {
      throw new Error("audio_claim_unknown_segment");
    }

    const dedupeKey = [claimId, segmentId, binding.direction].join("|");
    if (dedupe.has(dedupeKey)) {
      throw new Error("duplicate_audio_claim_binding");
    }
    dedupe.add(dedupeKey);

    const window = audioQuoteWindow({
      audio,
      transcript: input.transcript,
      segmentIds: [segmentId],
    });

    const ref = evidenceRef({
      audioRef: audio.audioRef,
      transcriptRef: input.transcript.transcriptRef,
      segmentId,
      startMs: window.startMs,
      endMs: window.endMs,
    });

    edges.push({
      claimId,
      evidenceRef: ref,
      direction: binding.direction,
      sourceFamilyId: audio.sourceFamilyId,
    });

    windows.push({
      evidenceRef: ref,
      audioRef: audio.audioRef,
      transcriptRef: input.transcript.transcriptRef,
      segmentId,
      startMs: window.startMs,
      endMs: window.endMs,
      sourceFamilyId: audio.sourceFamilyId,
      status: window.status,
    });
  }

  return {
    edges,
    windows,
    independentCorroboration: false,
    grantsFinding: false,
    status: "prepared_audio_claim_evidence_not_verdict",
  };
}
