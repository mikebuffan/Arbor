import { describe, expect, it } from "vitest";
import { parseAgencyVerification } from "../verifier";

describe("parseAgencyVerification", () => {
  it("accepts evidence-backed completion", () => {
    expect(
      parseAgencyVerification(
        JSON.stringify({
          complete: true,
          score: 1,
          unresolvedWork: [],
          evidence: ["tests passed"],
          strategyCorrection: null,
          behaviorViolations: [],
        }),
      ),
    ).toEqual({
      complete: true,
      score: 1,
      unresolvedWork: [],
      evidence: ["tests passed"],
      strategyCorrection: null,
      behaviorViolations: [],
    });
  });

  it("keeps unfinished work unfinished", () => {
    const result = parseAgencyVerification(`{
      "complete": false,
      "score": 0.4,
      "unresolvedWork": ["run build"],
      "evidence": [],
      "strategyCorrection": "verify before claiming complete",
      "behaviorViolations": []
    }`);

    expect(result.complete).toBe(false);
    expect(result.score).toBe(0.4);
    expect(result.unresolvedWork).toEqual(["run build"]);
  });

  it("clamps verifier score into the supported range", () => {
    const result = parseAgencyVerification(
      JSON.stringify({
        complete: false,
        score: 4,
        unresolvedWork: ["still working"],
        evidence: [],
        strategyCorrection: null,
        behaviorViolations: [],
      }),
    );

    expect(result.score).toBe(1);
  });

  it("parses directly observed behavior violations", () => {
    const result = parseAgencyVerification(
      JSON.stringify({
        complete: true,
        score: 0.95,
        unresolvedWork: [],
        evidence: ["goal completed"],
        strategyCorrection: null,
        behaviorViolations: [
          "candidate used a forbidden form of address",
        ],
      }),
    );

    expect(result.behaviorViolations).toEqual([
      "candidate used a forbidden form of address",
    ]);
  });

  it("fails closed on malformed verifier output without inventing behavior failure", () => {
    const result = parseAgencyVerification("looks good");

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork.length).toBeGreaterThan(0);
    expect(result.behaviorViolations).toEqual([]);
  });
});
