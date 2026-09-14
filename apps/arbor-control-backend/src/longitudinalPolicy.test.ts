import { describe, expect, it } from "vitest";
import { shouldCarryGoal } from "./longitudinalPolicy.js";
import type { ArborState } from "./types.js";

const active: ArborState = {
  activeSubsystem: "arbor",
  goal: "finish carrier repair",
  unresolvedWork: ["run remaining regressions"],
  strategyNotes: [],
  behavioralCorrections: [],
  acousticCorrections: [],
  voiceId: "cedar",
};

describe("longitudinal goal arbitration", () => {
  it("carries live work through brief continuation cues", () => {
    expect(shouldCarryGoal("okay", active)).toBe(true);
    expect(shouldCarryGoal("go", active)).toBe(true);
  });

  it("does not resurrect an explicitly completed goal", () => {
    expect(shouldCarryGoal("done", active)).toBe(false);
    expect(shouldCarryGoal("finished", active)).toBe(false);
  });

  it("allows explicit task switches", () => {
    expect(shouldCarryGoal("different task", active)).toBe(false);
  });
});
