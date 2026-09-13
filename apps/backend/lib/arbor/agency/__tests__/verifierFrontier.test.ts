import { describe, expect, it } from "vitest";
import { parseAgencyVerification } from "../verifier";

describe("agency verifier frontier", () => {
  it("fails completion closed when unresolved work remains", () => {
    const result = parseAgencyVerification(JSON.stringify({
      complete: true,
      score: 0.9,
      unresolvedWork: ["finish sibling branch"],
      evidence: ["first branch passed"],
      strategyCorrection: null,
      behaviorViolations: [],
    }));

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork).toEqual(["finish sibling branch"]);
  });
});
