import { describe, expect, it } from "vitest";
import { buildCarrierInjection, mergeCarrierState, uniqueNewest } from "./carrierPolicy.js";
import type { ArborState } from "./types.js";

describe("carrier policy", () => {
  it("preserves project continuity and applies a meaningful local overlay", () => {
    const project: ArborState = {
      activeSubsystem: "arbor", goal: "restore Arbor carrier",
      unresolvedWork: ["wire carrier into wake-up path"], strategyNotes: [],
      behavioralCorrections: ["Do not wait for repeated go."],
      acousticCorrections: [], voiceId: "cedar",
    };
    const blank: ArborState = {
      activeSubsystem: "arbor", goal: null, unresolvedWork: [], strategyNotes: [],
      behavioralCorrections: [], acousticCorrections: [], voiceId: "cedar",
    };
    const kept = mergeCarrierState(project, blank);
    expect(kept.goal).toBe(project.goal);
    expect(kept.unresolvedWork).toEqual(project.unresolvedWork);

    const local: ArborState = {
      ...blank, goal: "local task", unresolvedWork: ["finish local task"],
      behavioralCorrections: ["Newest correction."],
    };
    const merged = mergeCarrierState(project, local);
    expect(merged.goal).toBe("local task");
    expect(merged.unresolvedWork).toEqual(["finish local task"]);
    expect(merged.behavioralCorrections).toEqual([
      "Do not wait for repeated go.", "Newest correction.",
    ]);

    const injection = buildCarrierInjection(kept);
    expect(injection).toMatch(/ACTIVE GOAL/);
    expect(injection).toMatch(/UNRESOLVED WORK/);
    expect(injection).toMatch(/Identity -> valid corrections -> active goal\/open loops -> agency -> task\/subsystem/);
    expect(uniqueNewest(["Keep going", "keep   going", "Newest correction"]))
      .toEqual(["keep going", "Newest correction"]);
  });
});
