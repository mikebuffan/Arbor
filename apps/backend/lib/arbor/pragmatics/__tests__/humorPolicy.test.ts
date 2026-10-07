import { describe, expect, it } from "vitest";
import {
  assessHumorPragmatics,
  renderHumorPragmaticsPrompt,
  type HumorPragmaticsInput,
} from "../humorPolicy";

function context(
  partial: Partial<HumorPragmaticsInput> = {},
): HumorPragmaticsInput {
  return {
    baselineHumorLevel: 2,
    seriousness: "low",
    emotionalRisk: "low",
    relationshipPermission: "established",
    teasingPermission: "earned",
    callbackRelevance: 0.8,
    situationalIncongruity: 0.8,
    profanityUsefulness: 0.2,
    blockerPresent: false,
    technicalClarityRequired: false,
    userEnergy: "neutral",
    interactionMode: "text",
    ...partial,
  };
}

describe("humor pragmatics", () => {
  it("suppresses humor in critical or high-emotional-risk contexts", () => {
    expect(
      assessHumorPragmatics(context({ seriousness: "critical" })).disposition,
    ).toBe("suppress");

    expect(
      assessHumorPragmatics(context({ emotionalRisk: "high" })).disposition,
    ).toBe("suppress");
  });

  it("does not make low user energy erase baseline personality", () => {
    const result = assessHumorPragmatics(
      context({
        userEnergy: "low",
        callbackRelevance: 0.1,
        situationalIncongruity: 0.1,
        teasingPermission: "none",
      }),
    );

    expect(result.disposition).toBe("available");
    expect(result.allowedForms).toContain("dry_observation");
    expect(result.reasons).toContain("low_user_energy_does_not_disable_humor");
  });

  it("requires relationship and teasing permission for teasing", () => {
    const none = assessHumorPragmatics(
      context({
        relationshipPermission: "none",
        teasingPermission: "none",
      }),
    );
    expect(none.allowedForms).not.toContain("teasing");

    const earned = assessHumorPragmatics(context());
    expect(earned.allowedForms).toContain("teasing");
  });

  it("requires callback relevance instead of using callbacks as continuity proof", () => {
    const irrelevant = assessHumorPragmatics(
      context({ callbackRelevance: 0.2 }),
    );
    expect(irrelevant.allowedForms).not.toContain("callback");

    const relevant = assessHumorPragmatics(
      context({ callbackRelevance: 0.9 }),
    );
    expect(relevant.allowedForms).toContain("callback");
  });

  it("requires situational relevance for absurdity", () => {
    const random = assessHumorPragmatics(
      context({ situationalIncongruity: 0.1 }),
    );
    expect(random.allowedForms).not.toContain("light_absurdity");
  });

  it("treats profanity as emphasis only when useful", () => {
    const low = assessHumorPragmatics(
      context({ profanityUsefulness: 0.2 }),
    );
    expect(low.allowedForms).not.toContain("profanity_emphasis");

    const useful = assessHumorPragmatics(
      context({ profanityUsefulness: 0.9 }),
    );
    expect(useful.allowedForms).toContain("profanity_emphasis");
  });

  it("puts technical clarity and blockers before humor", () => {
    const technical = assessHumorPragmatics(
      context({ technicalClarityRequired: true }),
    );
    expect(technical.placement).toBe("embedded_after_clarity");

    const blocked = assessHumorPragmatics(
      context({ blockerPresent: true }),
    );
    expect(blocked.placement).toBe("embedded_after_clarity");
    expect(blocked.reasons).toContain("blocker_must_be_stated_before_humor");
  });

  it("honors active humor corrections without mutating baseline identity", () => {
    const result = assessHumorPragmatics(
      context({
        blockedForms: ["teasing", "callback", "profanity_emphasis"],
      }),
    );
    expect(result.allowedForms).not.toContain("teasing");
    expect(result.allowedForms).not.toContain("callback");
    expect(result.allowedForms).not.toContain("profanity_emphasis");
    expect(result.allowedForms).toContain("dry_observation");
    expect(result.reasons).toContain("active_humor_correction_applied");
  });

  it("never makes humor mandatory", () => {
    const result = assessHumorPragmatics(context());
    expect(result.humorRequired).toBe(false);
    expect(result.performedHumor).toBe(false);

    const prompt = renderHumorPragmaticsPrompt(result);
    expect(prompt).toContain("Humor is available but never required.");
    expect(prompt).toContain("Do not explain the joke or use callbacks merely to prove continuity.");
  });
});
