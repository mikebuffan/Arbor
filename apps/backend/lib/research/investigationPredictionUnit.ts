import {
  sealPredictionReceipt,
  type InvestigationPrediction,
} from "./investigationPredictionLedger";
import type { ResearchUnitHandler } from "./researchUnitDispatcher";

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_prediction_unit_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  minItems = 1,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      value.length < minItems ||
      value.length > maxItems) {
    throw new Error("investigation_prediction_unit_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_prediction_unit_duplicate_" + field);
  }
  return out;
}

function predictions(value: unknown): InvestigationPrediction[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    throw new Error("investigation_prediction_unit_invalid_predictions");
  }
  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("investigation_prediction_unit_invalid_prediction");
    }
    const r = raw as Record<string, unknown>;
    const kind = text(r.kind, "prediction_kind", 100);
    if (![
      "document_family",
      "event_tag",
      "relationship",
      "chronology",
      "entity_recurrence",
    ].includes(kind)) {
      throw new Error("investigation_prediction_unit_invalid_prediction_kind");
    }
    if (typeof r.requiredForHypothesis !== "boolean") {
      throw new Error(
        "investigation_prediction_unit_invalid_prediction_required",
      );
    }
    return {
      key: text(r.key, "prediction_key", 300),
      kind: kind as InvestigationPrediction["kind"],
      expected: text(r.expected, "prediction_expected", 4000),
      rationale: text(r.rationale, "prediction_rationale", 4000),
      requiredForHypothesis: r.requiredForHypothesis,
    };
  });
}

export function buildInvestigationPredictionUnitHandler(): ResearchUnitHandler {
  return async ({ session, claim, at }) => {
    const hypothesisId = text(
      claim.payload.hypothesisId,
      "hypothesis_id",
      300,
    );
    const hypothesis = text(
      claim.payload.hypothesis,
      "hypothesis",
      8000,
    );
    const basisEvidenceRefs = strings(
      claim.payload.basisEvidenceRefs,
      "basis_evidence_refs",
      1,
      100,
    );

    const trustedEvidence = new Set(session.completedEvidenceRefs);
    if (basisEvidenceRefs.some((ref) => !trustedEvidence.has(ref))) {
      throw new Error(
        "investigation_prediction_unit_untrusted_basis_evidence",
      );
    }

    const receipt = sealPredictionReceipt({
      hypothesisId,
      hypothesis,
      basisEvidenceRefs,
      createdAt: at,
      predictions: predictions(claim.payload.predictions),
    });

    return {
      sessionId: session.id,
      unitId: claim.unitId,
      idempotencyKey: claim.idempotencyKey,
      status: "completed",
      recordedAt: at,
      costCents: 0,
      evidenceRefs: basisEvidenceRefs,
      unresolvedRequiredWork: Math.max(
        0,
        session.unresolvedRequiredWork - 1,
      ),
      result: {
        predictionReceipt: receipt,
        searchAuthorizedByReceipt: false,
        independentlyVerifiedFinding: false,
      },
    };
  };
}
