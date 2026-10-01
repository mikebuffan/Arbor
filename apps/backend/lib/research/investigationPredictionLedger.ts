import type { FalsificationAttempt } from "./investigationIntegrity";

export type InvestigationPredictionKind =
  | "document_family"
  | "event_tag"
  | "relationship"
  | "chronology"
  | "entity_recurrence";

export type InvestigationPrediction = {
  key: string;
  kind: InvestigationPredictionKind;
  expected: string;
  rationale: string;
  requiredForHypothesis: boolean;
};

export type InvestigationPredictionReceipt = {
  hypothesisId: string;
  hypothesis: string;
  basisEvidenceRefs: string[];
  createdAt: string;
  predictions: InvestigationPrediction[];
  status: "sealed_before_search";
};

export type InvestigationPredictionObservation = {
  predictionKey: string;
  outcome:
    | "found"
    | "contradicted"
    | "not_found_in_searched_scope"
    | "not_searched";
  evidenceRefs: string[];
  searchedScope?: string | null;
  observedAt: string;
};

export type InvestigationPredictionEvaluation = {
  hypothesisId: string;
  status:
    | "untested"
    | "partially_tested"
    | "survived"
    | "weakened"
    | "failed";
  found: string[];
  contradicted: string[];
  notFoundInScope: string[];
  notSearched: string[];
  requiredPredictionFailures: string[];
  note:
    "Prediction evaluation is a hypothesis test, not a finding promotion.";
};

function requiredText(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_prediction_invalid_" + field);
  }
  return value.trim();
}

function requiredIso(value: unknown, field: string): string {
  const raw = requiredText(value, field, 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("investigation_prediction_invalid_" + field);
  }
  return raw;
}

function uniqueStrings(value: unknown, field: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new Error("investigation_prediction_invalid_" + field);
  }
  const out = value.map((item) => requiredText(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_prediction_duplicate_" + field);
  }
  return out;
}

export function sealPredictionReceipt(input: {
  hypothesisId: string;
  hypothesis: string;
  basisEvidenceRefs: string[];
  createdAt: string;
  predictions: InvestigationPrediction[];
}): InvestigationPredictionReceipt {
  const hypothesisId = requiredText(input.hypothesisId, "hypothesis_id", 300);
  const hypothesis = requiredText(input.hypothesis, "hypothesis", 8000);
  const basisEvidenceRefs = uniqueStrings(
    input.basisEvidenceRefs,
    "basis_evidence_refs",
    100,
  );
  const createdAt = requiredIso(input.createdAt, "created_at");

  if (
    !Array.isArray(input.predictions) ||
    input.predictions.length < 1 ||
    input.predictions.length > 30
  ) {
    throw new Error("investigation_prediction_invalid_predictions");
  }

  const seen = new Set<string>();
  const predictions = input.predictions.map((prediction) => {
    const key = requiredText(prediction.key, "prediction_key", 300);
    if (seen.has(key)) {
      throw new Error("investigation_prediction_duplicate_prediction_key");
    }
    seen.add(key);

    if (
      ![
        "document_family",
        "event_tag",
        "relationship",
        "chronology",
        "entity_recurrence",
      ].includes(prediction.kind)
    ) {
      throw new Error("investigation_prediction_invalid_kind");
    }

    if (typeof prediction.requiredForHypothesis !== "boolean") {
      throw new Error(
        "investigation_prediction_invalid_required_for_hypothesis",
      );
    }

    return {
      key,
      kind: prediction.kind,
      expected: requiredText(prediction.expected, "expected", 4000),
      rationale: requiredText(prediction.rationale, "rationale", 4000),
      requiredForHypothesis: prediction.requiredForHypothesis,
    };
  });

  return {
    hypothesisId,
    hypothesis,
    basisEvidenceRefs,
    createdAt,
    predictions,
    status: "sealed_before_search",
  };
}

export function assertPredictionPrecedesSearch(input: {
  receipt: InvestigationPredictionReceipt;
  searchStartedAt: string;
}): void {
  const searchStartedAt = requiredIso(
    input.searchStartedAt,
    "search_started_at",
  );
  if (Date.parse(input.receipt.createdAt) >= Date.parse(searchStartedAt)) {
    throw new Error("investigation_prediction_not_sealed_before_search");
  }
}

export function evaluatePredictionReceipt(input: {
  receipt: InvestigationPredictionReceipt;
  observations: InvestigationPredictionObservation[];
}): InvestigationPredictionEvaluation {
  const predictionByKey = new Map(
    input.receipt.predictions.map((prediction) => [
      prediction.key,
      prediction,
    ]),
  );
  if (!Array.isArray(input.observations) || input.observations.length > 100) {
    throw new Error("investigation_prediction_invalid_observations");
  }

  const byKey = new Map<string, InvestigationPredictionObservation>();
  for (const observation of input.observations) {
    const key = requiredText(
      observation.predictionKey,
      "observation_prediction_key",
      300,
    );
    if (!predictionByKey.has(key)) {
      throw new Error("investigation_prediction_unknown_prediction_key");
    }
    if (byKey.has(key)) {
      throw new Error("investigation_prediction_duplicate_observation");
    }
    if (
      ![
        "found",
        "contradicted",
        "not_found_in_searched_scope",
        "not_searched",
      ].includes(observation.outcome)
    ) {
      throw new Error("investigation_prediction_invalid_outcome");
    }
    if (!Array.isArray(observation.evidenceRefs) ||
        observation.evidenceRefs.length > 100 ||
        observation.evidenceRefs.some(
          (ref) => typeof ref !== "string" || !ref.trim(),
        )) {
      throw new Error("investigation_prediction_invalid_observation_evidence");
    }
    if (
      observation.outcome === "not_found_in_searched_scope" &&
      !observation.searchedScope?.trim()
    ) {
      throw new Error(
        "investigation_prediction_missing_not_found_search_scope",
      );
    }
    requiredIso(observation.observedAt, "observed_at");
    byKey.set(key, observation);
  }

  const found: string[] = [];
  const contradicted: string[] = [];
  const notFoundInScope: string[] = [];
  const notSearched: string[] = [];
  const requiredPredictionFailures: string[] = [];

  for (const prediction of input.receipt.predictions) {
    const observation = byKey.get(prediction.key);
    if (!observation || observation.outcome === "not_searched") {
      notSearched.push(prediction.key);
      continue;
    }
    if (observation.outcome === "found") {
      found.push(prediction.key);
      continue;
    }
    if (observation.outcome === "contradicted") {
      contradicted.push(prediction.key);
      if (prediction.requiredForHypothesis) {
        requiredPredictionFailures.push(prediction.key);
      }
      continue;
    }
    notFoundInScope.push(prediction.key);
  }

  let status: InvestigationPredictionEvaluation["status"];
  if (found.length === 0 && contradicted.length === 0 &&
      notFoundInScope.length === 0) {
    status = "untested";
  } else if (requiredPredictionFailures.length > 0) {
    status = "failed";
  } else if (contradicted.length > 0) {
    status = "weakened";
  } else if (notSearched.length > 0 || notFoundInScope.length > 0) {
    status = "partially_tested";
  } else {
    status = "survived";
  }

  return {
    hypothesisId: input.receipt.hypothesisId,
    status,
    found,
    contradicted,
    notFoundInScope,
    notSearched,
    requiredPredictionFailures,
    note:
      "Prediction evaluation is a hypothesis test, not a finding promotion.",
  };
}


export function predictionEvaluationToFalsificationAttempt(input: {
  receipt: InvestigationPredictionReceipt;
  evaluation: InvestigationPredictionEvaluation;
  observations: InvestigationPredictionObservation[];
}): FalsificationAttempt {
  if (input.evaluation.hypothesisId !== input.receipt.hypothesisId) {
    throw new Error("investigation_prediction_evaluation_hypothesis_mismatch");
  }
  if (input.evaluation.status === "untested") {
    throw new Error("investigation_prediction_untested_cannot_be_falsification");
  }

  const evidenceRefs = [
    ...new Set(
      input.observations.flatMap((observation) => observation.evidenceRefs),
    ),
  ].sort();

  const result: FalsificationAttempt["result"] =
    input.evaluation.status === "failed"
      ? "failed"
      : input.evaluation.status === "survived"
        ? "survived"
        : "inconclusive";

  return {
    id: "prediction-test:" + input.receipt.hypothesisId,
    hypothesis: input.receipt.hypothesis,
    result,
    evidenceRefs,
  };
}
