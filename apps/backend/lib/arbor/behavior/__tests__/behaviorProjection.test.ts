import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../behaviorProjection";

describe("one Arbor behavior projection", () => {
  const shared = {
    projectBehaviorPhilosophy: "Direct, familiar, grounded.",
    correctionRules: ["Do not flatten into one-word acknowledgments."],
    continuityMaterial: [
      "goal=finish voice alignment",
      "correction=General American, not British",
    ],
  };

  it("keeps one core across text and voice", () => {
    const text = buildArborBehaviorProjection({ ...shared, mode: "text" });
    const voice = buildArborBehaviorProjection({ ...shared, mode: "voice" });

    expect(text.proof.coreFingerprint).toBe(voice.proof.coreFingerprint);
    expect(text.proof.continuityFingerprint).toBe(
      voice.proof.continuityFingerprint,
    );
    expect(text.proof.projectionFingerprint).not.toBe(
      voice.proof.projectionFingerprint,
    );
  });

  it("keeps Annabelle inside the same core identity", () => {
    const text = buildArborBehaviorProjection({
      ...shared,
      mode: "text",
    });

    const annabelle = buildArborBehaviorProjection({
      ...shared,
      mode: "annabelle",
    });

    expect(annabelle.proof.coreFingerprint).toBe(
      text.proof.coreFingerprint,
    );

    expect(annabelle.proof.continuityFingerprint).toBe(
      text.proof.continuityFingerprint,
    );

    expect(annabelle.proof.projectionFingerprint).not.toBe(
      text.proof.projectionFingerprint,
    );
  });

  it("keeps acoustic drift separate from identity", () => {
    const voice = buildArborBehaviorProjection({ ...shared, mode: "voice" });
    expect(voice.promptBlock).toContain(
      "Acoustic state and behavioral identity are separate",
    );
  });
});
