import { describe, expect, it } from "vitest";
import { analyzeDecisionProvenance } from "./investigationDecisionProvenance";

describe("decision provenance", () => {
  it("separates information documented before a decision from information that appears later", () => {
    const result = analyzeDecisionProvenance({
      decision: {
        id: "decision:1",
        decisionAt: "2026-01-10T00:00:00Z",
        evidenceRef: "decision:record",
        citedBasisRefs: ["info:before", "info:missing"],
      },
      information: [
        {
          infoKey: "fact:before",
          availableAt: "2026-01-05T00:00:00Z",
          evidenceRef: "info:before",
          lineageKey: "lineage:before",
        },
        {
          infoKey: "fact:later",
          availableAt: "2026-01-20T00:00:00Z",
          evidenceRef: "info:later",
          lineageKey: "lineage:later",
        },
      ],
    });

    expect(result).toMatchObject({
      availableBeforeDecision: ["fact:before"],
      firstDocumentedAfterDecision: ["fact:later"],
      citedBasisAvailableBeforeDecision: ["info:before"],
      citedBasisNotDocumentedBeforeDecision: ["info:missing"],
    });
    expect(result.note).toContain("does not infer motive or competence");
  });

  it("does not backdate later evidence into the decision maker's documented information state", () => {
    const result = analyzeDecisionProvenance({
      decision: {
        id: "decision:1",
        decisionAt: "2026-01-10T00:00:00Z",
        evidenceRef: "decision:record",
        citedBasisRefs: [],
      },
      information: [{
        infoKey: "later-discovery",
        availableAt: "2026-02-01T00:00:00Z",
        evidenceRef: "later:record",
        lineageKey: "later:lineage",
      }],
    });

    expect(result.availableBeforeDecision).toEqual([]);
    expect(result.firstDocumentedAfterDecision).toEqual(["later-discovery"]);
  });
});
