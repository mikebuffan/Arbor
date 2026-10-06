export type InvestigationTheory = {
  id: string;
  description: string;
  supportEvidenceRefs: string[];
  contradictionEvidenceRefs: string[];
  unexplainedEvidenceRefs: string[];
  requiredPredictionFailures: string[];
};

export type InvestigationTheoryState = {
  id: string;
  description: string;
  supportEvidenceRefs: string[];
  contradictionEvidenceRefs: string[];
  unexplainedEvidenceRefs: string[];
  state: "active" | "weakened" | "falsified";
  note:
    "Theory state is an investigation ledger status, not a verdict or factual finding.";
};

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("competing_theories_invalid_" + field);
  }
  return value.trim();
}

function refs(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error("competing_theories_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  return [...new Set(out)].sort();
}

export function evaluateCompetingTheories(input: {
  theories: InvestigationTheory[];
}): InvestigationTheoryState[] {
  if (!Array.isArray(input.theories) ||
      input.theories.length < 2 ||
      input.theories.length > 50) {
    throw new Error("competing_theories_requires_multiple_theories");
  }
  const ids = new Set<string>();
  return input.theories.map((theory) => {
    const id = text(theory.id, "theory_id", 300);
    if (ids.has(id)) throw new Error("competing_theories_duplicate_id");
    ids.add(id);

    const supportEvidenceRefs = refs(
      theory.supportEvidenceRefs,
      "support_evidence_refs",
    );
    const contradictionEvidenceRefs = refs(
      theory.contradictionEvidenceRefs,
      "contradiction_evidence_refs",
    );
    const unexplainedEvidenceRefs = refs(
      theory.unexplainedEvidenceRefs,
      "unexplained_evidence_refs",
    );
    const requiredPredictionFailures = refs(
      theory.requiredPredictionFailures,
      "required_prediction_failures",
    );

    let state: InvestigationTheoryState["state"];
    if (requiredPredictionFailures.length > 0) {
      state = "falsified";
    } else if (contradictionEvidenceRefs.length > 0 ||
               unexplainedEvidenceRefs.length > 0) {
      state = "weakened";
    } else {
      state = "active";
    }

    return {
      id,
      description: text(theory.description, "description", 8000),
      supportEvidenceRefs,
      contradictionEvidenceRefs,
      unexplainedEvidenceRefs,
      state,
      note:
        "Theory state is an investigation ledger status, not a verdict or factual finding.",
    };
  });
}
