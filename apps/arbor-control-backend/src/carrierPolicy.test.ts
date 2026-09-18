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

describe("durable parent objective carrier", () => {
  it("does not let a blank conversation erase the project objective", () => {
    const project: ArborState = { activeSubsystem:"arbor", goal:"finish whole build", unresolvedWork:["step 2"], strategyNotes:[], acousticCorrections:[], voiceId:"cedar", objective:{parentGoal:"finish whole build",completionCriteria:["all tests green"],standingAuthorization:["safe reversible work"],hardStops:["merge","deploy"],nextAction:"step 2",checkpoint:"step 1 done",status:"active",revision:7}};
    const local: ArborState = {...project, goal:null, unresolvedWork:[], objective:undefined};
    const merged=mergeCarrierState(project,local);
    expect(merged.objective?.parentGoal).toBe("finish whole build");
    expect(merged.objective?.nextAction).toBe("step 2");
  });
  it("prefers only a newer objective revision", () => {
    const base: ArborState = {activeSubsystem:"arbor",goal:"x",unresolvedWork:["x"],strategyNotes:[],acousticCorrections:[],voiceId:"cedar",objective:{parentGoal:"root",completionCriteria:[],standingAuthorization:[],hardStops:[],nextAction:"a",checkpoint:null,status:"active",revision:5}};
    const stale: ArborState = {...base,objective:{...base.objective!,nextAction:"stale",revision:4}};
    expect(mergeCarrierState(base,stale).objective?.nextAction).toBe("a");
  });
});
