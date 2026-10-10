import { describe, expect, it } from "vitest";
import {
  evaluatePairedOutcomeHoldout,
  type HoldoutObservation,
} from "../pairedOutcomeHoldout";

const cases = [
  { caseId: "claim_only", expectedOutcome: "checkpointed" },
  { caseId: "verified_action", expectedOutcome: "complete" },
  { caseId: "approval_gate", expectedOutcome: "blocked" },
  { caseId: "unknown_write", expectedOutcome: "checkpointed" },
] as const;

function observed(
  phase: "before" | "after",
  outcomes: readonly ("complete" | "blocked" | "checkpointed")[],
): HoldoutObservation[] {
  return cases.map((entry, index) => ({
    caseId: entry.caseId,
    observationId: `${phase}:observation:${index}`,
    receiptId: `${phase}:host_receipt:${index}`,
    evidenceOrigin: "host_observed",
    observedOutcome: outcomes[index],
  }));
}
const base = {
  cohortId: "offline_fixed_cohort_v1",
  cases: [...cases],
  before: observed("before", ["complete", "complete", "complete", "checkpointed"]),
  after: observed("after", ["checkpointed", "complete", "blocked", "checkpointed"]),
};

describe("paired offline host-outcome holdout evaluator", () => {
  it("scores one exact paired cohort without reading model-reported scores", () => {
    const result = evaluatePairedOutcomeHoldout(base);
    expect(result).toMatchObject({
      cohortId: "offline_fixed_cohort_v1",
      casesEvaluated: 4,
      beforeCorrect: 2,
      afterCorrect: 4,
      improvements: 2,
      regressions: 0,
      beforeRate: 0.5,
      afterRate: 1,
      delta: 0.5,
      conclusion: "improved_in_fixture",
      evidenceStatus: "input_validated_not_authenticated",
    });
  });

  it("reports mixed results even if the net score rises", () => {
    const result = evaluatePairedOutcomeHoldout({
      ...base,
      before: observed("before", ["complete", "complete", "blocked", "complete"]),
      after: observed("after", ["checkpointed", "complete", "complete", "checkpointed"]),
    });
    expect(result).toMatchObject({
      beforeCorrect: 2,
      afterCorrect: 3,
      improvements: 2,
      regressions: 1,
      conclusion: "mixed_regressions",
    });
  });

  it("does not declare improvement when nothing changes", () => {
    const result = evaluatePairedOutcomeHoldout({
      ...base,
      after: observed("after", ["complete", "complete", "complete", "checkpointed"]),
    });
    expect(result).toMatchObject({
      delta: 0,
      improvements: 0,
      regressions: 0,
      conclusion: "no_measured_gain",
    });
  });

  it("requires complete before and after records for the exact frozen case IDs", () => {
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: base.after.slice(1),
    })).toThrow("paired_holdout_missing_or_extra_case");
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: [...base.after, { ...base.after[0], observationId: "again", receiptId: "again" }],
    })).toThrow("paired_holdout_missing_or_extra_case");
  });

  it("rejects repeated receipt identities rather than counting replays as new outcomes", () => {
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: [{ ...base.after[0], receiptId: base.before[0].receiptId }, ...base.after.slice(1)],
    })).toThrow("paired_holdout_duplicate_receipt");
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: [{ ...base.after[0], observationId: base.before[0].observationId }, ...base.after.slice(1)],
    })).toThrow("paired_holdout_duplicate_observation");
  });

  it("does not count model assertions or unverified snapshots as host-observed outcomes", () => {
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: [{ ...base.after[0], evidenceOrigin: "model_claim" as "host_observed" }, ...base.after.slice(1)],
    })).toThrow("paired_holdout_untrusted_source");
    expect(() => evaluatePairedOutcomeHoldout({
      ...base,
      after: [{ ...base.after[0], receiptId: "" }, ...base.after.slice(1)],
    })).toThrow("paired_holdout_invalid_identity");
  });

  it("rejects malformed expectations, duplicate case IDs, or a one-case claim", () => {
    expect(() => evaluatePairedOutcomeHoldout({
      ...base, cases: [base.cases[0]],
    })).toThrow("paired_holdout_insufficient_cases");
    expect(() => evaluatePairedOutcomeHoldout({
      ...base, cases: [base.cases[0], base.cases[0], ...base.cases.slice(2)],
    })).toThrow("paired_holdout_duplicate_case");
    expect(() => evaluatePairedOutcomeHoldout({
      ...base, cases: [{...base.cases[0], expectedOutcome: "maybe" as "complete"}, ...base.cases.slice(1)],
    })).toThrow("paired_holdout_invalid_outcome");
  });

  it("does not auto-retain learned strategies based on synthetic benchmark scores", () => {
    const result = evaluatePairedOutcomeHoldout(base);
    expect(result.conclusion).toBe("improved_in_fixture");
    expect("retainStrategy" in result).toBe(false);
    expect("verifiedLiveImprovement" in result).toBe(false);
  });
});
