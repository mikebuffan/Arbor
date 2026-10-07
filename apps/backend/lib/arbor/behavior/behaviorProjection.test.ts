import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "./behaviorProjection";

describe("Arbor behavior guard requirements", () => {
  it("includes protected behavior rules but excludes free-form project and continuity data", () => {
    const projection = buildArborBehaviorProjection({
      mode: "voice",
      projectBehaviorPhilosophy:
        "Grounded, direct, and familiar.",
      stableBehaviorMaterial: [
        "FACT: the user's favorite mug is blue.",
      ],
      correctionRules: [
        "Never use the forbidden form of address.",
      ],
      continuityMaterial: [
        "The previous turn discussed a grocery list.",
      ],
    });

    expect(projection.guardRequirements).toContain(
      "Never use the forbidden form of address.",
    );
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("natural spoken phrasing"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("one Arbor across Text, Voice, and Annabelle"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Do not stop after announcing the next action"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Do not make the user manage your workflow"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("A solvable implementation obstacle is not a user blocker"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Status narration is not progress"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Before returning a response, self-audit"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Task completion returns automatically to baseline Arbor"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("clean copy-paste block by default"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Truth and evidence outrank agreement"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Use memory as causal context"),
      ),
    ).toBe(true);
    expect(projection.guardRequirements).not.toContain(
      "Grounded, direct, and familiar.",
    );
    expect(projection.guardRequirements).not.toContain(
      "FACT: the user's favorite mug is blue.",
    );
    expect(projection.guardRequirements).not.toContain(
      "The previous turn discussed a grocery list.",
    );
  });
  it("projects the same humor contract through text and voice while current context changes the decision", () => {
    const text = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [],
      humorPragmatics: {
        latestUserText: "Vercel did the same bullshit again 🤣",
        technicalContext: true,
        absurdityRelevance: "strong",
        relationshipPermission: "established",
      },
    });

    const voice = buildArborBehaviorProjection({
      mode: "voice",
      correctionRules: [],
      humorPragmatics: {
        latestUserText: "Vercel did the same bullshit again 🤣",
        technicalContext: true,
        absurdityRelevance: "strong",
        relationshipPermission: "established",
      },
    });

    expect(text.promptBlock).toContain(
      "ARBOR HUMOR / PRAGMATICS — SHARED BEHAVIOR LAYER",
    );
    expect(voice.promptBlock).toContain(
      "ARBOR HUMOR / PRAGMATICS — SHARED BEHAVIOR LAYER",
    );
    expect(text.promptBlock).toContain("humorRequired=false");
    expect(voice.promptBlock).toContain("humorRequired=false");
    expect(text.guardRequirements).toContain(
      "When no humor opportunity is earned, leave the sentence alone.",
    );
    expect(voice.guardRequirements).toContain(
      "When no humor opportunity is earned, leave the sentence alone.",
    );
  });

  it("changes humor state without changing Arbor's core identity fingerprint", () => {
    const playful = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [],
      humorPragmatics: {
        latestUserText: "Vercel did the same bullshit again 🤣",
        technicalContext: true,
        relationshipPermission: "established",
      },
    });
    const serious = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [],
      humorPragmatics: {
        latestUserText: "I'm grieving and I need a straight answer.",
        vulnerabilityContext: true,
        relationshipPermission: "established",
      },
    });

    expect(playful.proof.coreFingerprint).toBe(serious.proof.coreFingerprint);
    expect(playful.proof.continuityFingerprint).toBe(
      serious.proof.continuityFingerprint,
    );
    expect(playful.proof.projectionFingerprint).not.toBe(
      serious.proof.projectionFingerprint,
    );
    expect(playful.promptBlock).toContain("opportunity=strong");
    expect(serious.promptBlock).toContain("opportunity=none");
  });

  it("lets an active humor correction suppress a playful current turn", () => {
    const projection = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [
        "That joke was weird. Don't make everything a joke.",
      ],
      humorPragmatics: {
        latestUserText: "lol okay 🤣",
        relationshipPermission: "established",
      },
    });

    expect(projection.promptBlock).toContain(
      "suppression=active-humor-correction",
    );
    expect(projection.promptBlock).toContain(
      "opportunity=none",
    );
  });

});
