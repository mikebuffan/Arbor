import { describe, expect, it } from "vitest";
import type { PatternHopEvidence } from "@/lib/memory/patternHop";
import { auditPatternHopSourceIndependence } from "@/lib/memory/patternHopSourceIndependence";

function evidence(id: string, content = "Original source text"): PatternHopEvidence {
  return {
    id,
    source: "archive",
    evidenceType: "document",
    content,
    confidence: 0.9,
    epistemicStatus: "direct",
  };
}

describe("Pattern Hop source independence warning boundary", () => {
  it("marks one original artifact reproduced in separate release wrappers", () => {
    const a = { ...evidence("wrapper-A"), sourceArtifactId: "underlying-document-7", sourceMessageId: "forward-1" };
    const b = { ...evidence("wrapper-B"), sourceArtifactId: "underlying-document-7", sourceMessageId: "forward-2" };
    const audit = auditPatternHopSourceIndependence([a, b]);
    expect(audit.warnings).toEqual([
      { evidenceIds: ["wrapper-A", "wrapper-B"], reason: "same_source_artifact", independenceStatus: "not_verified" },
    ]);
    expect(audit.independentCorroborationVerified).toBe(false);
  });

  it("marks duplicate source message under two stored row IDs", () => {
    const a = { ...evidence("db-1"), sourceThreadId: "thread-1", sourceMessageId: "message-9" };
    const b = { ...evidence("db-2", "a differently truncated copy"), sourceThreadId: "thread-1", sourceMessageId: "message-9" };
    expect(auditPatternHopSourceIndependence([a, b]).warnings[0].reason).toBe("same_original_message");
  });

  it("flags identical long quotes across different wrappers only as possible derivatives", () => {
    const quote = "One contemporaneous letter quoted in another released wrapper may have been recopied rather than independently witnessed.";
    const a = { ...evidence("A", quote), sourceArtifactId: "document-A", sourceMessageId: "message-A" };
    const b = { ...evidence("B", quote.toUpperCase()), sourceArtifactId: "document-B", sourceMessageId: "message-B" };
    const overlaps = auditPatternHopSourceIndependence([a, b]).warnings;
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].reason).toBe("identical_text_possible_derivative");
    expect(overlaps[0].independenceStatus).toBe("not_verified");
  });

  it("never identity-merges people by shared names, topics or vague similarity", () => {
    const a = evidence("a", "A reporter mentions an unrelated person named Alex in a court calendar");
    const b = evidence("b", "A separate interview mentions a person named Alex at a different event");
    const audit = auditPatternHopSourceIndependence([a, b]);
    expect(audit.warnings).toEqual([]);
    expect(audit.noWarningDoesNotProveIndependence).toBe(true);
  });

  it("does not label identical short boilerplate independent or proven", () => {
    const a = evidence("a", "No comment.");
    const b = evidence("b", "No comment.");
    const audit = auditPatternHopSourceIndependence([a, b]);
    expect(audit.warnings).toEqual([]);
    expect(audit.independentCorroborationVerified).toBe(false);
  });

  it("fails closed on an unbounded corpus instead of implying full audit coverage", () => {
    const input = Array.from({ length: 101 }, (_, i) => evidence(String(i)));
    expect(() => auditPatternHopSourceIndependence(input)).toThrow(
      "pattern_hop_source_independence_limit_exceeded",
    );
  });

  it("does not mutate or rewrite supplied evidence", () => {
    const items = [
      Object.freeze({ ...evidence("a", "some evidence"), sourceArtifactId: "same" }),
      Object.freeze({ ...evidence("b", "different evidence"), sourceArtifactId: "same" }),
    ];
    const before = JSON.stringify(items);
    auditPatternHopSourceIndependence(items);
    expect(JSON.stringify(items)).toBe(before);
  });
});
