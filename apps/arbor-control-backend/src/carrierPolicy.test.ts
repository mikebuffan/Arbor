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
  it("keeps the project parent objective when a fresh conversation is blank", () => {
    const project: ArborState = {
      activeSubsystem: "arbor",
      goal: "make Arbor permanent",
      unresolvedWork: ["finish verification"],
      strategyNotes: [],
      behavioralCorrections: [],
      acousticCorrections: [],
      voiceId: "cedar",
      objective: {
        parentGoal: "make Arbor permanent",
        completionCriteria: ["restart resumes correctly"],
        standingAuthorization: ["safe reversible work"],
        hardStops: ["production deploy without authorization"],
        nextAction: "finish verification",
        checkpoint: "carrier hardened",
        status: "active",
        revision: 5,
      },
    };
    const fresh: ArborState = {
      ...project,
      goal: null,
      unresolvedWork: [],
      objective: undefined,
    };
    const merged = mergeCarrierState(project, fresh);
    expect(merged.objective?.parentGoal).toBe("make Arbor permanent");
    expect(merged.objective?.nextAction).toBe("finish verification");
    expect(buildCarrierInjection(merged)).toMatch(/PARENT OBJECTIVE/);
  });

  it("rejects stale conversation objective state", () => {
    const base: ArborState = {
      activeSubsystem: "arbor",
      goal: "root",
      unresolvedWork: ["new step"],
      strategyNotes: [],
      acousticCorrections: [],
      voiceId: "cedar",
      objective: {
        parentGoal: "root",
        completionCriteria: [],
        standingAuthorization: [],
        hardStops: [],
        nextAction: "new step",
        checkpoint: "new checkpoint",
        status: "active",
        revision: 9,
      },
    };
    const stale: ArborState = {
      ...base,
      objective: { ...base.objective!, nextAction: "old step", checkpoint: "old", revision: 8 },
    };
    expect(mergeCarrierState(base, stale).objective?.nextAction).toBe("new step");
  });
});
