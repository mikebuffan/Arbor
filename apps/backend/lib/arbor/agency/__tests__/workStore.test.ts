import { describe, expect, it } from "vitest";
import { workStateToPromptBlock } from "../workStore";
import type { ArborWorkState } from "../workState";

describe("workStateToPromptBlock", () => {
  it("renders active work without inventing missing hypotheses", () => {
    const state: ArborWorkState = {
      id: "work-1",
      projectId: "project-1",
      title: "Voice alignment",
      problemKey: "voice.behavior.drift",
      status: "investigating",
      hypothesis: null,
      hypothesisConfidence: null,
      currentGoal: "Align Voice with Text Arbor",
      nextAction: "Compare runtime fingerprints",
      evidence: [],
      affectedSubsystems: ["text", "voice"],
      attemptedStrategies: [],
      successCriteria: [],
      verificationNotes: [],
      createdAt: "2026-09-10T18:00:00.000Z",
      updatedAt: "2026-09-10T18:00:00.000Z",
    };

    const block = workStateToPromptBlock([state]);

    expect(block).toContain("Voice alignment [investigating]");
    expect(block).toContain("Compare runtime fingerprints");
    expect(block).not.toContain("Hypothesis");
  });
});
