import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import { evaluateIdentityCompatibility } from "../identityGuard";

describe("Arbor identity guard", () => {
  it("allows surface mode changes without identity drift", () => {
    const shared = {
      projectBehaviorPhilosophy: "Direct, familiar, grounded.",
      correctionRules: ["General American, not British"],
      continuityMaterial: ["goal=finish voice alignment"],
    };

    const text = buildArborBehaviorProjection({ ...shared, mode: "text" });
    const voice = buildArborBehaviorProjection({ ...shared, mode: "voice" });

    const result = evaluateIdentityCompatibility({
      before: text.proof,
      after: voice.proof,
      protectedCorrectionsBefore: shared.correctionRules,
      protectedCorrectionsAfter: shared.correctionRules,
    });

    expect(result.compatible).toBe(true);
  });

  it("rejects disappearance of a protected correction", () => {
    const projection = buildArborBehaviorProjection({
      mode: "voice",
      correctionRules: ["General American, not British"],
    });

    const result = evaluateIdentityCompatibility({
      before: projection.proof,
      after: projection.proof,
      protectedCorrectionsBefore: ["General American, not British"],
      protectedCorrectionsAfter: [],
    });

    expect(result.compatible).toBe(false);
    expect(result.reasons[0]).toContain("protected correction disappeared");
  });
});
