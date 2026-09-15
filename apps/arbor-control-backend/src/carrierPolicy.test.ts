import { describe, expect, it } from "vitest";
import { buildCarrierInjection, mergeCarrierState, uniqueNewest } from "./carrierPolicy.js";
import type { ArborState } from "./types.js";

const blank = (): ArborState => ({
  activeSubsystem: "arbor",
  goal: null,
  unresolvedWork: [],
  strategyNotes: [],
  behavioralCorrections: [],
  acousticCorrections: [],
  voiceId: "cedar",
});

describe("carrier policy", () => {
  it("keeps durable project work when a conversation is blank", () => {
    const project: ArborState = {
      ...blank(),
      goal: "restore Arbor carrier",
      unresolvedWork: ["wire carrier into wake-up path"],
      behavioralCorrections: ["Do not wait for repeated go."],
    };
    const kept = mergeCarrierState(project, blank());
    expect(kept.goal).toBe(project.goal);
    expect(kept.unresolvedWork).toEqual(project.unresolvedWork);
    expect(buildCarrierInjection(kept)).toMatch(/ACTIVE GOAL/);
    expect(buildCarrierInjection(kept)).toMatch(/UNRESOLVED WORK/);
  });

  it("lets meaningful local work refine project state without replacing corrections", () => {
    const project: ArborState = {
      ...blank(),
      goal: "restore Arbor carrier",
      unresolvedWork: ["wire carrier into wake-up path"],
      behavioralCorrections: ["Do not wait for repeated go."],
    };
    const local: ArborState = {
      ...blank(),
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

  it("deduplicates corrections with newest precedence", () => {
    expect(uniqueNewest(["Keep going", "keep   going", "Newest correction"])).toEqual([
      "keep going",
      "Newest correction",
    ]);
  });
});
