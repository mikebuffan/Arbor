import { describe, expect, it } from "vitest";
import { chooseNextWork, scoreWorkState } from "../prioritizer";
import { decideRecovery } from "../recovery";
import type { ArborWorkState } from "../workState";

function work(overrides: Partial<ArborWorkState> = {}): ArborWorkState {
  return {
    id: "w", projectId: "p", title: "Problem", problemKey: "problem",
    status: "investigating", hypothesis: null, hypothesisConfidence: null,
    currentGoal: "repair", nextAction: "inspect runtime", evidence: [],
    affectedSubsystems: ["text"], attemptedStrategies: [],
    successCriteria: [], verificationNotes: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z", ...overrides,
  };
}

describe("Arbor development arbiter", () => {
  it("raises recurring cross-subsystem evidence", () => {
    const candidate = work({
      affectedSubsystems: ["text", "voice", "annabelle"],
      evidence: [
        { id: "e1", source: "voice", summary: "voice drift",
          observedAt: "2026-09-10T01:00:00.000Z", confidence: 0.9 },
        { id: "e2", source: "user_correction", summary: "same behavior drift recurred",
          observedAt: "2026-09-10T02:00:00.000Z", confidence: 1 },
      ],
    });
    const priority = scoreWorkState(candidate);
    expect(priority.reasons).toContain("recurring evidence");
    expect(priority.reasons).toContain("cross-subsystem impact");
  });

  it("does not choose resolved work over active work", () => {
    const resolved = work({ id: "resolved", status: "resolved" });
    const active = work({ id: "active", status: "open" });
    expect(chooseNextWork([resolved, active])?.id).toBe("active");
  });

  it("chooses an untried alternate after failure", () => {
    const state = work({ attemptedStrategies: ["provider-a"], nextAction: "provider-a" });
    const decision = decideRecovery(state, {
      failedStrategy: "provider-a",
      alternateActions: ["provider-a", "provider-b"],
    });
    expect(decision.kind).toBe("alternate");
    expect(decision.nextAction).toBe("provider-b");
  });

  it("stops for missing authority", () => {
    const decision = decideRecovery(work(), {
      requiresAuthority: true,
      alternateActions: ["do the thing"],
    });
    expect(decision.kind).toBe("block");
    expect(decision.reason).toContain("authority");
  });
});
