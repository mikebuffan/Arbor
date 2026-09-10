import { describe, expect, it } from "vitest";
import {
  chooseNextWork,
  rankWorkStates,
} from "../developmentArbiter";
import type { ArborWorkState } from "../workState";

function work(
  id: string,
  overrides: Partial<ArborWorkState> = {},
): ArborWorkState {
  return {
    id,
    projectId: "project-1",
    title: id,
    problemKey: id,
    status: "open",
    hypothesis: null,
    hypothesisConfidence: null,
    currentGoal: "repair",
    nextAction: "inspect",
    evidence: [],
    affectedSubsystems: [],
    attemptedStrategies: [],
    successCriteria: [],
    verificationNotes: [],
    createdAt: "2026-09-10T18:00:00.000Z",
    updatedAt: "2026-09-10T18:00:00.000Z",
    ...overrides,
  };
}

describe("development arbiter", () => {
  it("prefers repeated cross-surface failures", () => {
    const isolated = work("isolated", {
      evidence: [
        {
          id: "e1",
          source: "text",
          summary: "single issue",
          observedAt: "2026-09-10T18:00:00.000Z",
          confidence: 0.9,
        },
      ],
      affectedSubsystems: ["text"],
    });

    const systemic = work("systemic", {
      evidence: [
        {
          id: "e2",
          source: "voice",
          summary: "voice drift",
          observedAt: "2026-09-10T18:01:00.000Z",
          confidence: 0.9,
        },
        {
          id: "e3",
          source: "user_correction",
          summary: "same behavioral failure observed",
          observedAt: "2026-09-10T18:02:00.000Z",
          confidence: 1,
        },
      ],
      affectedSubsystems: ["text", "voice"],
    });

    expect(chooseNextWork([isolated, systemic])?.id).toBe(
      "systemic",
    );
  });

  it("does not reopen resolved work", () => {
    const ranked = rankWorkStates([
      work("done", {
        status: "resolved",
        evidence: [
          {
            id: "e1",
            source: "test",
            summary: "verified",
            observedAt: "2026-09-10T18:00:00.000Z",
            confidence: 1,
          },
        ],
      }),
    ]);

    expect(ranked[0]?.score).toBe(0);
  });
});
