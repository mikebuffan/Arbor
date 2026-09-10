import { describe, expect, it } from "vitest";
import {
  buildContinuityState,
  continuityToPromptBlock,
} from "../state";
import type { ArborWorkState } from "../../agency/workState";

describe("Arbor continuity state", () => {
  it("carries unresolved work and corrections across modes", () => {
    const work: ArborWorkState = {
      id: "w1",
      projectId: "p1",
      title: "Voice alignment",
      problemKey: "voice.behavior.drift",
      status: "repairing",
      hypothesis: null,
      hypothesisConfidence: null,
      currentGoal: "Align Voice with Text",
      nextAction: "Run live voice test",
      evidence: [],
      affectedSubsystems: ["voice"],
      attemptedStrategies: [],
      successCriteria: [],
      verificationNotes: [],
      createdAt: "2026-09-10T18:00:00.000Z",
      updatedAt: "2026-09-10T18:00:00.000Z",
    };

    const state = buildContinuityState({
      mode: "voice",
      currentGoal: work.currentGoal,
      workItems: [work],
      activeCorrections: [
        "General American, not British",
        "General American, not British",
      ],
    });

    expect(state.unresolvedWork).toHaveLength(1);
    expect(state.activeCorrections).toEqual([
      "General American, not British",
    ]);

    const block = continuityToPromptBlock(state);
    expect(block).toContain("Mode: voice");
    expect(block).toContain("Run live voice test");
    expect(block).toContain("General American, not British");
  });
});
