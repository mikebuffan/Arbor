import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../behaviorProjection";

describe("One Arbor behavior projection", () => {
  const shared = {
    projectBehaviorPhilosophy:
      "Direct, familiar, grounded, witty when appropriate.",
    stableBehaviorMaterial: ["Do not use forbidden forms of address."],
    correctionRules: ["Do not flatten into one-word acknowledgments."],
    continuityMaterial: [
      "current-goal: test Text/Voice alignment",
      "active-correction: British accent is wrong",
    ],
  };

  it("keeps the same core behavior across Text and Voice", () => {
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

  it("does not let acoustic drift redefine Arbor", () => {
    const voice = buildArborBehaviorProjection({ ...shared, mode: "voice" });

    expect(voice.promptBlock).toContain(
      "Acoustic state and behavioral identity are separate",
    );
    expect(voice.promptBlock).toContain(
      "claim a cause only when host, provider, or runtime evidence supports it",
    );
  });

  it("prevents Voice from collapsing into acknowledgments", () => {
    const voice = buildArborBehaviorProjection({ ...shared, mode: "voice" });

    expect(voice.promptBlock).toContain("bare acknowledgment");
    expect(voice.promptBlock).toContain(
      "preserve the substance and judgment Text Arbor would provide",
    );
  });
});
