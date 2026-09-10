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
        }),
      ),
    ).toEqual({
      complete: true,
      score: 1,
      unresolvedWork: [],
      evidence: ["tests passed"],
      strategyCorrection: null,
    });
  });

  it("keeps unfinished work unfinished", () => {
    const result = parseAgencyVerification(`{
      "complete": false,
      "score": 0.4,
      "unresolvedWork": ["run build"],
      "evidence": [],
      "strategyCorrection": "verify before claiming complete"
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
      }),
    );

    expect(result.score).toBe(1);
  });

  it("fails closed on malformed verifier output", () => {
    const result = parseAgencyVerification("looks good");

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork.length).toBeGreaterThan(0);
  });
});
