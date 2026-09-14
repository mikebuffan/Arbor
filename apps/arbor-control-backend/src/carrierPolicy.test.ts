import { describe, expect, it } from "vitest";
import {
  buildCarrierInjection,
  mergeCarrierState,
  uniqueNewest,
} from "./carrierPolicy.js";
import type { ArborState } from "./types.js";

const project: ArborState = {
  activeSubsystem: "arbor",
  goal: "restore Arbor carrier",
  unresolvedWork: ["wire carrier into wake-up path"],
  strategyNotes: [],
  behavioralCorrections: ["Do not wait for repeated go."],
  acousticCorrections: [],
  voiceId: "cedar",
};

const blank: ArborState = {
  activeSubsystem: "arbor",
  goal: null,
  unresolvedWork: [],
  strategyNotes: [],
  behavioralCorrections: [],
  acousticCorrections: [],
  voiceId: "cedar",
};

describe("longitudinal carrier policy", () => {
  it("keeps the durable project carrier when the conversation overlay is blank", () => {
    const kept = mergeCarrierState(project, blank);

    expect(kept.goal).toBe(project.goal);
    expect(kept.unresolvedWork).toEqual(project.unresolvedWork);
  });

  it("allows a meaningful local goal while preserving corrections", () => {
    const local: ArborState = {
      ...blank,
      goal: "local task",
      unresolvedWork: ["finish local task"],
      behavioralCorrections: ["Newest correction."],
    };

    const merged = mergeCarrierState(project, local);

    expect(merged.goal).toBe("local task");
    expect(merged.unresolvedWork).toEqual(["finish local task"]);
    expect(merged.behavioralCorrections).toEqual([
      "Do not wait for repeated go.",
      "Newest correction.",
    ]);
  });

  it("renders active goal, open loops, and precedence into the carrier injection", () => {
    const injection = buildCarrierInjection(
      mergeCarrierState(project, blank),
    );

    expect(injection).toMatch(/ACTIVE GOAL/);
    expect(injection).toMatch(/UNRESOLVED WORK/);
    expect(injection).toMatch(
      /Identity -> valid corrections -> active goal\/open loops -> agency -> task\/subsystem/,
    );
  });

  it("uses newest normalized correction when duplicates differ only by casing or whitespace", () => {
    expect(
      uniqueNewest([
        "Keep going",
        "keep   going",
        "Newest correction",
      ]),
    ).toEqual([
      "keep going",
      "Newest correction",
    ]);
  });
});
