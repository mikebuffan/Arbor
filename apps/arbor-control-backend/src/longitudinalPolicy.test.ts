import { describe, expect, it } from "vitest";

import {
  explicitlyContinues,
  rankUnresolvedWork,
  scoreOpenLoopRelevance,
  shouldCarryGoal,
} from "./longitudinalPolicy.js";
import type { ArborState } from "./types.js";

function state(
  overrides: Partial<ArborState> = {},
): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "repair Arbor",
    unresolvedWork: ["run final verification"],
    strategyNotes: [],
    acousticCorrections: [],
    voiceId: "cedar",
    ...overrides,
  };
}

describe("recovered longitudinal open-loop policy", () => {
  it("recognizes historical resume cues", () => {
    for (const cue of [
      "continue",
      "pull it up",
      "bring it back",
      "we just made",
      "pick up where we left off",
    ]) {
      expect(explicitlyContinues(cue)).toBe(true);
    }
  });

  it("restores the last confirmed goal on a resume cue even if unresolvedWork was emptied", () => {
    expect(
      shouldCarryGoal(
        "continue",
        state({ unresolvedWork: [] }),
      ),
    ).toBe(true);
  });

  it("does not replace live unfinished work for an ordinary follow-up", () => {
    expect(
      shouldCarryGoal(
        "Make sure the voice side carries too",
        state(),
      ),
    ).toBe(true);
  });

  it("allows an explicit branch switch to supersede unfinished work", () => {
    expect(
      shouldCarryGoal(
        "Switch to a new task: check deployment",
        state(),
      ),
    ).toBe(false);
  });

  it("preserves the exact old open-loop relevance signal", () => {
    expect(
      scoreOpenLoopRelevance({
        itemText: "Still needs final verification",
      }),
    ).toBe(0.7);

    expect(
      scoreOpenLoopRelevance({
        itemText: "ordinary background note",
      }),
    ).toBe(0);
  });

  it("ranks unfinished/open-loop work ahead of unrelated work", () => {
    expect(
      rankUnresolvedWork([
        "ordinary background note",
        "current priority: finish cognition integration",
      ]),
    ).toEqual([
      "current priority: finish cognition integration",
      "ordinary background note",
    ]);
  });
});
