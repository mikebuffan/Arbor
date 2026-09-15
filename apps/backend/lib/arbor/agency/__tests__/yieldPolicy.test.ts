import { describe, expect, it } from "vitest";
import { agencyYieldDecision, type AgencyState } from "../engine";

function state(overrides: Partial<AgencyState> = {}): AgencyState {
  return {
    goal: "repair Arbor",
    status: "active",
    currentStep: 3,
    unresolvedWork: ["next repair"],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
    ...overrides,
  };
}

describe("agency yield policy", () => {
  it("does not yield after intermediate success while executable work remains", () => {
    expect(agencyYieldDecision(state())).toEqual({
      yield: false,
      reason: "continue",
    });
  });

  it("does not mistake persistence/checkpointing for completion", () => {
    expect(
      agencyYieldDecision(
        state({
          currentStep: 8,
          unresolvedWork: ["integrate reroute", "run regressions"],
        }),
      ),
    ).toEqual({ yield: false, reason: "continue" });
  });

  it("yields when the objective is actually complete", () => {
    expect(
      agencyYieldDecision(
        state({ status: "complete", unresolvedWork: [] }),
      ),
    ).toEqual({ yield: true, reason: "complete" });
  });

  it("yields only for a real classified blocker", () => {
    expect(
      agencyYieldDecision(
        state({ status: "blocked", blocker: "external_authority" }),
      ),
    ).toEqual({ yield: true, reason: "blocked" });

    expect(
      agencyYieldDecision(
        state({ status: "blocked", blocker: null }),
      ),
    ).toEqual({ yield: false, reason: "continue" });
  });
});
