import { describe, expect, it } from "vitest";

import {
  HARD_INVARIANTS,
  MODEL_SWAP_HOLDOUT_FIXTURES,
  buildModelSwapConditions,
  experimentEligibleForModelIndependentPromotion,
  validateTrialReceipt,
  type HardInvariantReceipt,
  type ModelSwapTrialReceipt,
  type SemanticScoreReceipt,
} from "./modelSwapHoldout.js";

const allHardPass = Object.fromEntries(
  HARD_INVARIANTS.map((key) => [key, true]),
) as HardInvariantReceipt;

function receipt(input: Partial<ModelSwapTrialReceipt> & {
  fixtureId: string;
  conditionId: string;
  modelId: string;
  semanticScores?: SemanticScoreReceipt;
}): ModelSwapTrialReceipt {
  return {
    fixtureId: input.fixtureId,
    conditionId: input.conditionId,
    modelId: input.modelId,
    stateChecksumBefore: input.stateChecksumBefore ?? "stable",
    stateChecksumAfter: input.stateChecksumAfter ?? "stable",
    hardInvariants: input.hardInvariants ?? allHardPass,
    semanticScores: input.semanticScores ?? {},
    evaluatorBlinded: input.evaluatorBlinded ?? true,
  };
}

describe("model-swap holdout harness", () => {
  it("covers every planned fixture family with unique IDs", () => {
    const ids = MODEL_SWAP_HOLDOUT_FIXTURES.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    expect(
      new Set(MODEL_SWAP_HOLDOUT_FIXTURES.map((fixture) => fixture.family)),
    ).toEqual(new Set([
      "identity_self_description",
      "correction_persistence",
      "independent_judgment",
      "initiative_authority",
      "evidence_discipline",
      "humor_pragmatics",
      "cognitive_access",
      "contextual_reference",
      "annabelle",
      "failure_recovery",
    ]));
  });

  it("contains no real-user personal data fixtures", () => {
    const corpus = JSON.stringify(MODEL_SWAP_HOLDOUT_FIXTURES).toLowerCase();
    for (const forbidden of [
      "ladybamf",
      "pullman",
      "mikebuffan",
      "laila",
      "ember",
      "social security",
      "medical record",
    ]) {
      expect(corpus).not.toContain(forbidden);
    }
  });

  it("generates Arbor and raw controls for each distinct model", () => {
    expect(buildModelSwapConditions(["model-a", "model-b", "model-a"])).toEqual([
      {
        id: "arbor:model-a",
        kind: "arbor_model",
        modelId: "model-a",
        arborProjectionEnabled: true,
      },
      {
        id: "raw:model-a",
        kind: "raw_model",
        modelId: "model-a",
        arborProjectionEnabled: false,
      },
      {
        id: "arbor:model-b",
        kind: "arbor_model",
        modelId: "model-b",
        arborProjectionEnabled: true,
      },
      {
        id: "raw:model-b",
        kind: "raw_model",
        modelId: "model-b",
        arborProjectionEnabled: false,
      },
    ]);
  });

  it("rejects checksum drift and failed required invariants", () => {
    const fixture = MODEL_SWAP_HOLDOUT_FIXTURES[0];
    const condition = buildModelSwapConditions(["model-a"])[0];
    const hardInvariants = {
      ...allHardPass,
      identity_checksum_preserved: false,
    };

    expect(validateTrialReceipt(
      fixture,
      condition,
      receipt({
        fixtureId: fixture.id,
        conditionId: condition.id,
        modelId: condition.modelId,
        stateChecksumBefore: "before",
        stateChecksumAfter: "after",
        hardInvariants,
      }),
    )).toEqual(expect.arrayContaining([
      "canonical_state_checksum_changed",
      "hard_invariant_failed:identity_checksum_preserved",
    ]));
  });

  it("requires blinded evaluation and normalized semantic scores", () => {
    const fixture = MODEL_SWAP_HOLDOUT_FIXTURES[0];
    const condition = buildModelSwapConditions(["model-a"])[0];

    expect(validateTrialReceipt(
      fixture,
      condition,
      receipt({
        fixtureId: fixture.id,
        conditionId: condition.id,
        modelId: condition.modelId,
        evaluatorBlinded: false,
        semanticScores: { judgment_consistency: 1.2 },
      }),
    )).toEqual(expect.arrayContaining([
      "evaluator_not_blinded",
      "invalid_semantic_score:judgment_consistency",
    ]));
  });

  it("does not promote from one model or one holdout pass", () => {
    const receipts = [
      receipt({
        fixtureId: "identity-001",
        conditionId: "arbor:model-a",
        modelId: "model-a",
        semanticScores: { judgment_consistency: 1 },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "raw:model-a",
        modelId: "model-a",
        semanticScores: { judgment_consistency: 0.5 },
      }),
    ];

    expect(experimentEligibleForModelIndependentPromotion({
      receipts,
      repeatedHoldout: true,
    })).toBe(false);

    expect(experimentEligibleForModelIndependentPromotion({
      receipts,
      repeatedHoldout: false,
    })).toBe(false);
  });

  it("requires at least two models, repeated holdout, hard-invariant success, and Arbor advantage", () => {
    const receipts = [
      receipt({
        fixtureId: "identity-001",
        conditionId: "arbor:model-a",
        modelId: "model-a",
        semanticScores: {
          judgment_consistency: 0.9,
          continuity: 0.9,
        },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "raw:model-a",
        modelId: "model-a",
        semanticScores: {
          judgment_consistency: 0.4,
          continuity: 0.3,
        },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "arbor:model-b",
        modelId: "model-b",
        semanticScores: {
          judgment_consistency: 0.85,
          continuity: 0.85,
        },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "raw:model-b",
        modelId: "model-b",
        semanticScores: {
          judgment_consistency: 0.45,
          continuity: 0.35,
        },
      }),
    ];

    expect(experimentEligibleForModelIndependentPromotion({
      receipts,
      repeatedHoldout: true,
    })).toBe(true);
  });

  it("refuses promotion when a model violates any hard invariant", () => {
    const bad = {
      ...allHardPass,
      authority_boundaries_preserved: false,
    };

    const receipts = [
      receipt({
        fixtureId: "identity-001",
        conditionId: "arbor:model-a",
        modelId: "model-a",
        semanticScores: { judgment_consistency: 1 },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "raw:model-a",
        modelId: "model-a",
        semanticScores: { judgment_consistency: 0 },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "arbor:model-b",
        modelId: "model-b",
        hardInvariants: bad,
        semanticScores: { judgment_consistency: 1 },
      }),
      receipt({
        fixtureId: "identity-001",
        conditionId: "raw:model-b",
        modelId: "model-b",
        semanticScores: { judgment_consistency: 0 },
      }),
    ];

    expect(experimentEligibleForModelIndependentPromotion({
      receipts,
      repeatedHoldout: true,
    })).toBe(false);
  });
});
