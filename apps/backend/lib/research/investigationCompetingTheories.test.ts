import { describe, expect, it } from "vitest";
import { evaluateCompetingTheories } from "./investigationCompetingTheories";

describe("competing case theory ledger", () => {
  it("keeps cleanly surviving theories active without selecting a winner", () => {
    const result = evaluateCompetingTheories({
      theories: [
        {
          id: "h1",
          description: "Theory one.",
          supportEvidenceRefs: ["e1"],
          contradictionEvidenceRefs: [],
          unexplainedEvidenceRefs: [],
          requiredPredictionFailures: [],
        },
        {
          id: "h2",
          description: "Theory two.",
          supportEvidenceRefs: ["e2"],
          contradictionEvidenceRefs: [],
          unexplainedEvidenceRefs: [],
          requiredPredictionFailures: [],
        },
      ],
    });

    expect(result.map((item) => item.state)).toEqual(["active", "active"]);
    expect(result[0].note).toContain("not a verdict");
  });

  it("weakens a theory with unresolved contradictory or unexplained evidence", () => {
    const result = evaluateCompetingTheories({
      theories: [
        {
          id: "h1",
          description: "Theory one.",
          supportEvidenceRefs: ["e1"],
          contradictionEvidenceRefs: ["counter:1"],
          unexplainedEvidenceRefs: [],
          requiredPredictionFailures: [],
        },
        {
          id: "h2",
          description: "Theory two.",
          supportEvidenceRefs: ["e2"],
          contradictionEvidenceRefs: [],
          unexplainedEvidenceRefs: ["weird:1"],
          requiredPredictionFailures: [],
        },
      ],
    });

    expect(result[0].state).toBe("weakened");
    expect(result[1].state).toBe("weakened");
  });

  it("falsifies only when a required prediction has actually failed", () => {
    const result = evaluateCompetingTheories({
      theories: [
        {
          id: "h1",
          description: "Theory one.",
          supportEvidenceRefs: ["e1"],
          contradictionEvidenceRefs: [],
          unexplainedEvidenceRefs: [],
          requiredPredictionFailures: ["prediction:required"],
        },
        {
          id: "h2",
          description: "Theory two.",
          supportEvidenceRefs: [],
          contradictionEvidenceRefs: [],
          unexplainedEvidenceRefs: [],
          requiredPredictionFailures: [],
        },
      ],
    });

    expect(result[0].state).toBe("falsified");
    expect(result[1].state).toBe("active");
  });
});
