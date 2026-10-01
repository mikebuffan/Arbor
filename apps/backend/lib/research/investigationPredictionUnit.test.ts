import { describe, expect, it } from "vitest";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import { buildInvestigationPredictionUnitHandler } from "./investigationPredictionUnit";

const AT = "2026-09-30T22:00:00.000Z";

function session(
  completedEvidenceRefs = ["evidence:1", "evidence:2"],
): ResearchSession {
  return {
    id: "session-1",
    userId: "owner-1",
    projectId: "project-1",
    objective: "Synthetic prediction test.",
    status: "running",
    startedAt: "2026-09-30T20:00:00.000Z",
    deadlineAt: "2026-10-01T00:00:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 0,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 3,
    completedEvidenceRefs,
  };
}

function claim(
  overrides: Partial<ResearchClaim> = {},
): ResearchClaim {
  return {
    unitId: "prediction-unit",
    leaseToken: "lease-1",
    idempotencyKey: "prediction-hypothesis-1",
    kind: "research.prediction",
    payload: {
      hypothesisId: "hypothesis-1",
      hypothesis:
        "A shared intermediary may explain the independent record clusters.",
      basisEvidenceRefs: ["evidence:1", "evidence:2"],
      predictions: [{
        key: "role-record",
        kind: "document_family",
        expected:
          "An independent role-specific record should identify the intermediary.",
        rationale:
          "A continuing operational role normally leaves role-specific records.",
        requiredForHypothesis: true,
      }],
    },
    maxCostReservationCents: 0,
    ...overrides,
  };
}

describe("prediction research unit", () => {
  it("seals a prediction receipt into durable research result before any search", async () => {
    const handler = buildInvestigationPredictionUnitHandler();
    const receipt = await handler({
      session: session(),
      claim: claim(),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(receipt).toMatchObject({
      status: "completed",
      evidenceRefs: ["evidence:1", "evidence:2"],
      unresolvedRequiredWork: 2,
      result: {
        predictionReceipt: {
          hypothesisId: "hypothesis-1",
          createdAt: AT,
          status: "sealed_before_search",
        },
        searchAuthorizedByReceipt: false,
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("rejects basis evidence that is not already trusted in persisted session evidence", async () => {
    const handler = buildInvestigationPredictionUnitHandler();

    await expect(handler({
      session: session(["evidence:1"]),
      claim: claim(),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    })).rejects.toThrow(
      "investigation_prediction_unit_untrusted_basis_evidence",
    );
  });

  it("does not let the prediction receipt itself authorize a search", async () => {
    const handler = buildInvestigationPredictionUnitHandler();
    const receipt = await handler({
      session: session(),
      claim: claim(),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect((receipt.result as any).searchAuthorizedByReceipt).toBe(false);
  });

  it("derives timestamp from the trusted executor clock instead of model payload", async () => {
    const handler = buildInvestigationPredictionUnitHandler();
    const receipt = await handler({
      session: session(),
      claim: claim({
        payload: {
          ...(claim().payload),
          createdAt: "2099-01-01T00:00:00Z",
        },
      }),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect((receipt.result as any).predictionReceipt.createdAt).toBe(AT);
  });
});
