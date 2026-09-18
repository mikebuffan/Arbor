import { describe, expect, it } from "vitest";
import { buildCarrierInjection, mergeCarrierState, uniqueNewest } from "./carrierPolicy.js";
import { emptyCognitiveRuntimeState, updateCognitiveRuntime } from "./cognitiveRuntime.js";
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

  it("merges project and conversation cognitive state instead of letting an overlay erase it", () => {
    const projectCognitive = updateCognitiveRuntime({
      prior: emptyCognitiveRuntimeState(Date.parse("2026-09-18T12:00:00Z")),
      now: Date.parse("2026-09-18T12:00:00Z"),
      signals: [{
        id: "project-goal", kind: "task", content: "finish build",
        reason: "project objective", provenance: ["project"], confidence: 1,
        intensity: 1, assertedAt: "2026-09-18T12:00:00Z", unresolved: true,
      }],
    });
    const conversationCognitive = updateCognitiveRuntime({
      prior: emptyCognitiveRuntimeState(Date.parse("2026-09-18T12:01:00Z")),
      now: Date.parse("2026-09-18T12:01:00Z"),
      signals: [{
        id: "local-conflict", kind: "conflict", content: "evidence disagrees",
        reason: "needs discrimination", provenance: ["local"], confidence: .8,
        intensity: .8, assertedAt: "2026-09-18T12:01:00Z", unresolved: true,
      }],
    });

    const base: ArborState = {
      activeSubsystem: "arbor", goal: "finish build", unresolvedWork: ["remaining"],
      strategyNotes: [], behavioralCorrections: [], acousticCorrections: [],
      voiceId: "cedar", cognitiveRuntime: projectCognitive,
    };
    const local: ArborState = {
      ...base, goal: "local task", unresolvedWork: ["local"],
      cognitiveRuntime: conversationCognitive,
    };

    const merged = mergeCarrierState(base, local);
    expect(merged.cognitiveRuntime?.signals.map((x) => x.id).sort())
      .toEqual(["local-conflict", "project-goal"]);
    expect(merged.cognitiveRuntime?.attention.unresolvedIds.sort())
      .toEqual(["local-conflict", "project-goal"]);
  });
});
