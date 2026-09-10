import {
  describe,
  expect,
  it,
} from "vitest";

import {
  acousticCorrections,
  behaviorCorrections,
  classifyCorrection,
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
