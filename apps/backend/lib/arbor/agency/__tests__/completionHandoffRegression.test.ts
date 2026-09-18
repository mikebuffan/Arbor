import { describe, expect, it } from "vitest";
import { parseAgencyVerification } from "../verifier";

describe("agency completion regression contract", () => {
  it("preserves unresolved work returned by the verifier", () => {
    const parsed = parseAgencyVerification(JSON.stringify({
      complete: false,
      score: 0.55,
      unresolvedWork: ["continue independent corpus processing", "recheck CI later"],
      evidence: ["one repair cluster completed"],
      strategyCorrection: "Do not hand control back at an intermediate checkpoint.",
      behaviorViolations: ["premature workflow handoff"],
    }));
    expect(parsed.complete).toBe(false);
    expect(parsed.unresolvedWork).toContain("continue independent corpus processing");
    expect(parsed.behaviorViolations).toContain("premature workflow handoff");
  });

  it("does not convert malformed verifier output into completion", () => {
    expect(parseAgencyVerification("checkpoint reached").complete).toBe(false);
  });
});
