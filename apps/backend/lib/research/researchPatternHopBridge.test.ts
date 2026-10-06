import { describe, expect, it } from "vitest";
import { preparePatternHopFromReviewPacket } from "./researchPatternHopBridge";
import { buildSourceOriginFamilies } from "./investigationGraph";
import { detectTemporalConflicts, type TimelineObservation } from "./timelineAnalysis";
import type { ReviewPacket } from "./reviewWorkbench";

function fixture() {
  const observation: TimelineObservation = {
    observationId: "calendar-a", entityIds: ["unresolved-person"], placeId: "place-a",
    relation: "exact", startUtc: "2020-01-01T12:00:00Z", endUtc: null,
    reportedAtUtc: null, evidenceRefs: ["page-a"],
  };
  const conflicts = detectTemporalConflicts([observation, {
    ...observation, observationId: "calendar-b", placeId: "place-b", evidenceRefs: ["page-b"],
  }]);
  const packet: ReviewPacket = {
    packetId: "packet-1", title: "Synthetic conflicting calendars",
    source: { documentId: "doc-a", physicalPage: 2, originalBytesSha256: "a".repeat(64), pageHash: "b".repeat(64), sourceRefs: ["page-a"] },
    extractedText: "synthetic", ocr: null, tableCandidates: [],
    identityCandidates: [{ candidateId: "candidate-person", label: "Unresolved Example", status: "ambiguous", basisMentionIds: ["page-a", "page-b"] }],
    contradictions: conflicts, releaseVariants: [], visualAssets: [], privacyFlagIds: [], publicationStatus: "hold",
  };
  return {
    packet,
    directive: { directiveId: conflicts[0].conflictId, triggerEvidenceRefs: conflicts[0].evidenceRefs, reason: "Two records place an unresolved identity in different places at the same time", targetQuery: "Compare original calendar pages and resolve the identity", stoppingCondition: "Original page and identity review, or exhausted authorized source family" },
    candidateId: "hop-1", objective: "Resolve the calendar conflict", maxDepth: 2, maxHopsPerAttempt: 3,
  };
}

describe("existing document review -> prepared Pattern Hop", () => {
  it("preserves page provenance, contradiction, identity hold and explicit stopping condition", () => {
    const input = fixture();
    const families = buildSourceOriginFamilies([
      { sourceId: "calendar-copy-a", derivesFromSourceIds: ["missing-calendar"], contentHash: null },
      { sourceId: "calendar-copy-b", derivesFromSourceIds: ["missing-calendar"], contentHash: null },
    ]);
    expect(families).toHaveLength(1);
    const prepared = preparePatternHopFromReviewPacket(input);
    expect(prepared.seed.triggerEvidenceRefs).toEqual(["page-a", "page-b"]);
    expect(prepared.provenance).toMatchObject({ packetId: "packet-1", physicalPage: 2, originalBytesSha256: "a".repeat(64), pageHash: "b".repeat(64) });
    expect(prepared.stoppingCondition).toBe(input.directive.stoppingCondition);
    expect(prepared.reviewRequirements).toMatchObject({ unresolvedIdentities: 1, contradictions: 1, originalPageReviewRequired: true });
    expect(prepared.status).toBe("prepared_not_submitted");
    expect(prepared.executionRequested).toBe(false);
    expect(prepared.canSubmitToHistoricalMemoryTool).toBe(false);
    expect(prepared.independentCorroborationVerified).toBe(false);
    expect(preparePatternHopFromReviewPacket(JSON.parse(JSON.stringify(input)))).toEqual(prepared);
  });

  it("rejects a lead with invented evidence outside the reviewed packet", () => {
    const input = fixture();
    input.directive.triggerEvidenceRefs = ["unrelated-page"];
    expect(() => preparePatternHopFromReviewPacket(input)).toThrow("pattern_bridge_trigger_outside_review_packet");
  });

  it("retains the existing source-review and bounded-pass gates", () => {
    const input = fixture();
    expect(() => preparePatternHopFromReviewPacket({ ...input, maxHopsPerAttempt: 11 })).toThrow("invalid_pattern_bridge_max_hops");
    expect(() => preparePatternHopFromReviewPacket({ ...input, packet: { ...input.packet, publicationStatus: "published" as never } })).toThrow("review_packet_must_remain_hold");
  });
});
