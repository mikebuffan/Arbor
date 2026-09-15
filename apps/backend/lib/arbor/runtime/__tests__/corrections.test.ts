import {
  describe,
  expect,
  it,
} from "vitest";

import {
  acousticCorrections,
  behaviorCorrections,
  classifyCorrection,
  correctionFamily,
  createCorrection,
} from "../corrections";

describe("Arbor correction routing", () => {
  it("routes British-accent feedback acoustically", () => {
    expect(
      classifyCorrection(
        "You're still British",
      ),
    ).toBe("acoustic");
  });

  it("routes personality compression behaviorally", () => {
    expect(
      classifyCorrection(
        "You're supposed to say more than that",
      ),
    ).toBe("behavior");
  });

  it.each([
    "Your voice is too formal",
    "Your voice sounds like customer service",
    "You're doing the presenter thing again",
  ])(
    "lets explicit behavior outrank generic voice wording: %s",
    (text) => {
      expect(classifyCorrection(text)).toBe("behavior");
    },
  );

  it.each([
    "You're still British",
    "The accent drifted again",
    "Your pronunciation went weird",
    "The voice is too breathy",
  ])(
    "keeps genuinely acoustic feedback acoustic: %s",
    (text) => {
      expect(classifyCorrection(text)).toBe("acoustic");
    },
  );

  it.each([
    "Don't be weird. Be normal.",
    "You're getting robotic",
    "You overcorrected and got too stiff",
    "You're trying too hard now",
  ])(
    "routes Voice correction-overshoot feedback as identity drift: %s",
    (text) => {
      expect(classifyCorrection(text)).toBe("behavior");
      expect(correctionFamily("behavior", text)).toBe("identity-drift");
    },
  );

  it("converges agency wording variants onto one correction family", () => {
    expect(correctionFamily("behavior", "Don't stop. Keep going.")).toBe(
      "agency-followthrough",
    );
    expect(
      correctionFamily(
        "behavior",
        "Why did you stop? I should not have to tell you to go again.",
      ),
    ).toBe("agency-followthrough");

    const first = createCorrection({
      value: "Don't stop. Keep going.",
      source: "text",
      observedAt: "2026-09-14T20:00:00.000Z",
      kind: "behavior",
    });
    const second = createCorrection({
      value: "Why did you stop? Keep going.",
      source: "text",
      observedAt: "2026-09-14T20:01:00.000Z",
      kind: "behavior",
    });

    expect(first.id).toBe("behavior:agency-followthrough");
    expect(second.id).toBe(first.id);
  });

  it("keeps identity drift separate from agency corrections", () => {
    expect(
      correctionFamily("behavior", "You've drifted. Come back."),
    ).toBe("identity-drift");
    expect(
      correctionFamily("behavior", "Keep going and don't stop."),
    ).toBe("agency-followthrough");
  });

  it("converges Voice overcorrection variants onto identity drift", () => {
    const first = createCorrection({
      value: "Don't be weird. Be normal.",
      source: "voice",
      observedAt: "2026-09-14T20:10:00.000Z",
    });
    const second = createCorrection({
      value: "You're overcorrecting and sounding robotic.",
      source: "voice",
      observedAt: "2026-09-14T20:11:00.000Z",
    });

    expect(first.id).toBe("behavior:identity-drift");
    expect(second.id).toBe(first.id);
  });

  it("does not let acoustic corrections rewrite behavior rules", () => {
    const corrections = [
      createCorrection({
        value:
          "General American, not British",
        source: "voice",
        observedAt:
          "2026-09-10T21:00:00.000Z",
      }),
      createCorrection({
        value:
          "Do not collapse into one-word acknowledgments",
        source: "text",
        observedAt:
          "2026-09-10T21:01:00.000Z",
      }),
    ];

    expect(
      acousticCorrections(corrections),
    ).toEqual([
      "General American, not British",
    ]);

    expect(
      behaviorCorrections(corrections),
    ).toEqual([
      "Do not collapse into one-word acknowledgments",
    ]);
  });
});
