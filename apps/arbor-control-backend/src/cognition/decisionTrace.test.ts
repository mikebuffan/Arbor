import { describe, expect, it } from "vitest";

import {
  attachDecisionOutcome,
  createDecisionTrace,
} from "./decisionTrace.js";

describe("cognition decision trace", () => {
  it("records reason, evidence, alternatives, and risk before action", () => {
    const trace = createDecisionTrace({
      decisionId: "d-1",
      action: "continue open loop",
      reason: "highest-priority unfinished work is known",
      evidence: ["goal:repair", "goal:repair"],
      alternatives: ["ask user", "stop"],
      risk: "low",
      createdAt: "2026-09-14T20:00:00.000Z",
    });

    expect(trace.evidence).toEqual(["goal:repair"]);
    expect(trace.outcome).toBeNull();
  });

  it("attaches eventual observed outcome without rewriting original decision evidence", () => {
    const trace = createDecisionTrace({
      decisionId: "d-2",
      action: "run verification",
      reason: "implementation changed",
      evidence: ["commit:abc"],
      alternatives: ["skip verification"],
      risk: "low",
      createdAt: "2026-09-14T20:00:00.000Z",
    });

    const completed = attachDecisionOutcome(
      trace,
      {
        status: "completed",
        observedAt: "2026-09-14T20:01:00.000Z",
        detail: "all tests passed",
      },
    );

    expect(completed.reason).toBe(trace.reason);
    expect(completed.evidence).toEqual(["commit:abc"]);
    expect(completed.outcome?.status).toBe("completed");
  });

  it("does not overwrite an already recorded outcome", () => {
    const trace = attachDecisionOutcome(
      createDecisionTrace({
        decisionId: "d-3",
        action: "deploy",
        reason: "verified branch",
        risk: "medium",
        createdAt: "2026-09-14T20:00:00.000Z",
      }),
      {
        status: "blocked",
        observedAt: "2026-09-14T20:01:00.000Z",
        detail: "approval required",
      },
    );

    const second = attachDecisionOutcome(
      trace,
      {
        status: "completed",
        observedAt: "2026-09-14T20:02:00.000Z",
        detail: "should not replace historical result",
      },
    );

    expect(second).toEqual(trace);
  });
});
