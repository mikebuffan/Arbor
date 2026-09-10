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
});
