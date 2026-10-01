import { describe, expect, it } from "vitest";
import {
  assertPredictionPrecedesSearch,
  evaluatePredictionReceipt,
  predictionEvaluationToFalsificationAttempt,
  sealPredictionReceipt,
} from "./investigationPredictionLedger";

function receipt() {
  return sealPredictionReceipt({
    hypothesisId: "hypothesis-1",
    hypothesis:
      "A shared administrative role may explain the cross-family recurrence.",
    basisEvidenceRefs: ["evidence:1", "evidence:2"],
    createdAt: "2026-09-30T20:00:00.000Z",
    predictions: [
      {
        key: "role-record",
        kind: "document_family",
        expected: "A role-specific filing or employment record exists.",
        rationale:
          "A real continuing administrative role should normally leave a role-specific record.",
        requiredForHypothesis: true,
      },
      {
        key: "calendar-recurrence",
        kind: "entity_recurrence",
        expected:
          "The same resolved entity recurs in an independent calendar lineage.",
        rationale:
          "Independent recurrence would make passive copying less likely.",
        requiredForHypothesis: false,
      },
    ],
  });
}

describe("prediction-before-search ledger", () => {
  it("seals predictions before research so later results cannot rewrite the prediction", () => {
    const sealed = receipt();
    expect(sealed.status).toBe("sealed_before_search");
    expect(sealed.predictions).toHaveLength(2);
    expect(() => assertPredictionPrecedesSearch({
      receipt: sealed,
      searchStartedAt: "2026-09-30T20:01:00.000Z",
    })).not.toThrow();
  });

  it("rejects a receipt created after the search starts", () => {
    expect(() => assertPredictionPrecedesSearch({
      receipt: receipt(),
      searchStartedAt: "2026-09-30T19:59:59.000Z",
    })).toThrow(
      "investigation_prediction_not_sealed_before_search",
    );
  });

  it("fails a hypothesis when a required prediction is contradicted", () => {
    const result = evaluatePredictionReceipt({
      receipt: receipt(),
      observations: [{
        predictionKey: "role-record",
        outcome: "contradicted",
        evidenceRefs: ["evidence:counter"],
        observedAt: "2026-09-30T21:00:00.000Z",
      }],
    });

    expect(result).toMatchObject({
      status: "failed",
      contradicted: ["role-record"],
      requiredPredictionFailures: ["role-record"],
    });
    expect(result.note).toContain("not a finding promotion");
  });

  it("does not convert a bounded search miss into proof that the prediction is false", () => {
    const result = evaluatePredictionReceipt({
      receipt: receipt(),
      observations: [{
        predictionKey: "role-record",
        outcome: "not_found_in_searched_scope",
        evidenceRefs: [],
        searchedScope:
          "County property and corporate index searched for 2018-2020 only.",
        observedAt: "2026-09-30T21:00:00.000Z",
      }],
    });

    expect(result.status).toBe("partially_tested");
    expect(result.notFoundInScope).toEqual(["role-record"]);
    expect(result.requiredPredictionFailures).toEqual([]);
  });

  it("requires the search scope when recording a not-found result", () => {
    expect(() => evaluatePredictionReceipt({
      receipt: receipt(),
      observations: [{
        predictionKey: "role-record",
        outcome: "not_found_in_searched_scope",
        evidenceRefs: [],
        observedAt: "2026-09-30T21:00:00.000Z",
      }],
    })).toThrow(
      "investigation_prediction_missing_not_found_search_scope",
    );
  });

  it("marks a fully tested non-contradicted prediction set as survived without calling it a finding", () => {
    const result = evaluatePredictionReceipt({
      receipt: receipt(),
      observations: [
        {
          predictionKey: "role-record",
          outcome: "found",
          evidenceRefs: ["evidence:role"],
          observedAt: "2026-09-30T21:00:00.000Z",
        },
        {
          predictionKey: "calendar-recurrence",
          outcome: "found",
          evidenceRefs: ["evidence:calendar"],
          observedAt: "2026-09-30T21:05:00.000Z",
        },
      ],
    });

    expect(result).toMatchObject({
      status: "survived",
      found: ["role-record", "calendar-recurrence"],
    });
    expect(result.note).toBe(
      "Prediction evaluation is a hypothesis test, not a finding promotion.",
    );
  });

  it("converts a tested prediction receipt into a falsification attempt for the integrity gate", () => {
    const sealed = receipt();
    const observations = [{
      predictionKey: "role-record",
      outcome: "contradicted" as const,
      evidenceRefs: ["evidence:counter"],
      observedAt: "2026-09-30T21:00:00.000Z",
    }];
    const evaluation = evaluatePredictionReceipt({
      receipt: sealed,
      observations,
    });

    expect(predictionEvaluationToFalsificationAttempt({
      receipt: sealed,
      evaluation,
      observations,
    })).toEqual({
      id: "prediction-test:hypothesis-1",
      hypothesis:
        "A shared administrative role may explain the cross-family recurrence.",
      result: "claim_failed",
      evidenceRefs: ["evidence:counter"],
    });
  });

  it("refuses to create a falsification receipt from an untested prediction", () => {
    const sealed = receipt();
    const evaluation = evaluatePredictionReceipt({
      receipt: sealed,
      observations: [],
    });

    expect(() => predictionEvaluationToFalsificationAttempt({
      receipt: sealed,
      evaluation,
      observations: [],
    })).toThrow(
      "investigation_prediction_untested_cannot_be_falsification",
    );
  });

  it("rejects duplicate prediction keys because predictions must remain individually testable", () => {
    expect(() => sealPredictionReceipt({
      hypothesisId: "hypothesis-1",
      hypothesis: "Synthetic.",
      basisEvidenceRefs: ["evidence:1"],
      createdAt: "2026-09-30T20:00:00.000Z",
      predictions: [
        {
          key: "same",
          kind: "document_family",
          expected: "A",
          rationale: "A",
          requiredForHypothesis: false,
        },
        {
          key: "same",
          kind: "event_tag",
          expected: "B",
          rationale: "B",
          requiredForHypothesis: false,
        },
      ],
    })).toThrow(
      "investigation_prediction_duplicate_prediction_key",
    );
  });
});
