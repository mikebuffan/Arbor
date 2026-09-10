import { describe, expect, it } from "vitest";
import { parseAgencyVerification } from "../verifier";

describe("parseAgencyVerification", () => {
  it("accepts evidence-backed completion", () => {
    expect(
      parseAgencyVerification(
        JSON.stringify({
          complete: true,
          unresolvedWork: [],
          evidence: ["tests passed"],
          strategyCorrection: null,
        }),
      ),
    ).toEqual({
      complete: true,
      unresolvedWork: [],
      evidence: ["tests passed"],
      strategyCorrection: null,
    });
  });

  it("keeps unfinished work unfinished", () => {
    const result = parseAgencyVerification(`{
      "complete": false,
      "unresolvedWork": ["run build"],
      "evidence": [],
      "strategyCorrection": "verify before claiming complete"
    }`);

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork).toEqual(["run build"]);
  });

  it("fails closed on malformed verifier output", () => {
    const result = parseAgencyVerification("looks good");

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork.length).toBeGreaterThan(0);
  });
});
