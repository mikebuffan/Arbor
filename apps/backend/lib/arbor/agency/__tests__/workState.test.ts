import { describe, expect, it } from "vitest";
import {
  addWorkEvidence,
  advanceWorkState,
  setWorkHypothesis,
  type ArborWorkState,
} from "../workState";

const base: ArborWorkState = {
  id: "work-1",
  projectId: "project-1",
  title: "Voice alignment",
  problemKey: "voice.behavior.drift",
  status: "open",
  hypothesis: null,
  hypothesisConfidence: null,
  currentGoal: "Keep Text and Voice behavior aligned",
  nextAction: "Collect evidence",
  evidence: [],
  affectedSubsystems: ["text", "voice"],
  attemptedStrategies: [],
  successCriteria: [
    "Text and Voice share the same core behavior fingerprint",
  ],
  verificationNotes: [],
  createdAt: "2026-09-10T18:00:00.000Z",
  updatedAt: "2026-09-10T18:00:00.000Z",
};

describe("Arbor longitudinal work state", () => {
  it("deduplicates evidence and clamps confidence", () => {
    const evidence = {
      id: "e1",
      source: "user_correction" as const,
      summary: "  Voice collapsed into one-word replies.  ",
      observedAt: "2026-09-10T18:01:00.000Z",
      confidence: 5,
    };

    const once = addWorkEvidence(base, evidence);
    const twice = addWorkEvidence(once, evidence);

    expect(twice.evidence).toHaveLength(1);
    expect(twice.evidence[0]?.confidence).toBe(1);
    expect(twice.evidence[0]?.summary).toBe(
      "Voice collapsed into one-word replies.",
    );
  });

  it("tracks attempted strategies without duplicates", () => {
    const first = advanceWorkState(base, {
      status: "repairing",
      attemptedStrategy: "shared behavior projection",
      updatedAt: "2026-09-10T18:02:00.000Z",
    });

    const second = advanceWorkState(first, {
      status: "verifying",
      attemptedStrategy: "shared behavior projection",
      verificationNote: "Core fingerprints matched.",
      updatedAt: "2026-09-10T18:03:00.000Z",
    });

    expect(second.attemptedStrategies).toEqual([
      "shared behavior projection",
    ]);
    expect(second.verificationNotes).toEqual([
      "Core fingerprints matched.",
    ]);
  });

  it("keeps hypotheses explicitly probabilistic", () => {
    const next = setWorkHypothesis(
      base,
      "Voice route may be bypassing shared behavior state",
      0.62,
      "2026-09-10T18:04:00.000Z",
    );

    expect(next.hypothesisConfidence).toBe(0.62);
    expect(next.hypothesis).toContain("may be");
  });
});
