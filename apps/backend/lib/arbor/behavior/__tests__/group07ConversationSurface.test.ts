import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../behaviorProjection";
import { assessHumorPragmatics, type HumorPragmaticsInput } from "../../pragmatics/humorPolicy";
import { renderArborThroughVoiceGate } from "../../voice/acousticProjection";
import { acousticCorrections, behaviorCorrections, createCorrection } from "../../runtime/corrections";
import { deriveArborBodyState } from "../../body/bodySystem";

const humor = (overrides: Partial<HumorPragmaticsInput> = {}): HumorPragmaticsInput => ({
  baselineHumorLevel: 2,
  seriousness: "low",
  emotionalRisk: "low",
  relationshipPermission: "established",
  teasingPermission: "earned",
  callbackRelevance: 0.9,
  situationalIncongruity: 0.8,
  profanityUsefulness: 0.1,
  blockerPresent: false,
  technicalClarityRequired: false,
  userEnergy: "neutral",
  interactionMode: "text",
  ...overrides,
});

describe("Group 7 cross-surface synthetic contracts (NOT real model/voice evaluation)", () => {
  it("keeps shared behavioral baseline across Text, Voice and Annabelle while preserving mode distinctions", () => {
    const corrections = ["Don't erase the practical explanation when speaking."];
    const inputs = (mode: "text" | "voice" | "annabelle") =>
      buildArborBehaviorProjection({ mode, correctionRules: corrections });
    const text = inputs("text");
    const voice = inputs("voice");
    const annabelle = inputs("annabelle");

    expect(voice.proof.coreFingerprint).toBe(text.proof.coreFingerprint);
    expect(annabelle.proof.coreFingerprint).toBe(text.proof.coreFingerprint);
    expect(voice.proof.projectionFingerprint).not.toBe(text.proof.projectionFingerprint);
    expect(voice.guardRequirements).toContain(corrections[0]);
    expect(voice.promptBlock).toContain("Handle interruptions naturally");
    expect(text.guardRequirements.join(" ")).toContain("Technical discussion does not disable Arbor");
  });

  it("keeps acoustic corrections out of text behavior and preserves canonical speech content", () => {
    const corrections = [
      createCorrection({
        value: "Your voice sounds British again.",
        source: "voice",
        observedAt: "2026-10-07T18:00:00.000Z",
      }),
      createCorrection({
        value: "You're doing the presenter thing again.",
        source: "text",
        observedAt: "2026-10-07T18:01:00.000Z",
      }),
    ];
    expect(acousticCorrections(corrections)).toEqual(["Your voice sounds British again."]);
    expect(behaviorCorrections(corrections)).toEqual(["You're doing the presenter thing again."]);
    const canonicalText = "  Here's the fix. Then I'll verify it.  ";
    const gate = renderArborThroughVoiceGate(canonicalText, "arbor", acousticCorrections(corrections));
    expect(gate.text).toBe(canonicalText);
    expect(gate.instructions).toContain("British");
    expect(gate.instructions).not.toContain("presenter thing again");
  });

  it("does not force jokes, lose ordinary familiarity with low energy, or joke over a real blocker", () => {
    const tired = assessHumorPragmatics(humor({ userEnergy: "low", teasingPermission: "none" }));
    expect(tired.disposition).toBe("available");
    expect(tired.humorRequired).toBe(false);
    expect(tired.allowedForms).not.toContain("teasing");

    const serious = assessHumorPragmatics(humor({ seriousness: "critical" }));
    expect(serious.disposition).toBe("suppress");
    expect(serious.intensity).toBe(0);

    const blocked = assessHumorPragmatics(humor({ blockerPresent: true, technicalClarityRequired: true }));
    expect(blocked.placement).toBe("embedded_after_clarity");
    expect(blocked.humorRequired).toBe(false);
  });

  it("keeps downshift as bounded pacing/safety and never authorizes identity mutation", () => {
    const body = deriveArborBodyState({
      latestUserText: "This may be unsafe. Slow down and verify.",
      activeSubsystem: "arbor",
      mode: "voice",
    });
    expect(body.vagal.downshift).toBe(true);
    expect(body.immune.identityMutationAllowed).toBe(false);
    expect(body.integumentary.durableWriteback).toBe("explicit-only");
  });
});
