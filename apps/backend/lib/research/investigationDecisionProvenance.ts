export type InvestigationDecision = {
  id: string;
  decisionAt: string;
  evidenceRef: string;
  citedBasisRefs: string[];
};

export type InvestigationInformationRecord = {
  infoKey: string;
  availableAt: string;
  evidenceRef: string;
  lineageKey: string;
};

export type InvestigationDecisionProvenance = {
  decisionId: string;
  availableBeforeDecision: string[];
  firstDocumentedAfterDecision: string[];
  citedBasisAvailableBeforeDecision: string[];
  citedBasisNotDocumentedBeforeDecision: string[];
  evidenceRefs: string[];
  note:
    "Decision provenance separates what is documented as available at the time from later knowledge; it does not infer motive or competence.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("decision_provenance_invalid_" + field);
  }
  return value.trim();
}

function iso(value: unknown, field: string): string {
  const raw = text(value, field, 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("decision_provenance_invalid_" + field);
  }
  return raw;
}

function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error("decision_provenance_invalid_" + field);
  }
  return [...new Set(value.map((item) => text(item, field, 1000)))];
}

export function analyzeDecisionProvenance(input: {
  decision: InvestigationDecision;
  information: InvestigationInformationRecord[];
}): InvestigationDecisionProvenance {
  const decisionAt = iso(input.decision.decisionAt, "decision_at");
  const decisionId = text(input.decision.id, "decision_id", 300);
  const decisionEvidenceRef = text(
    input.decision.evidenceRef,
    "decision_evidence_ref",
    1000,
  );
  const citedBasisRefs = strings(
    input.decision.citedBasisRefs,
    "cited_basis_refs",
  );

  if (!Array.isArray(input.information) || input.information.length > 20_000) {
    throw new Error("decision_provenance_invalid_information");
  }
  const info = input.information.map((record) => ({
    infoKey: text(record.infoKey, "info_key", 1000),
    availableAt: iso(record.availableAt, "available_at"),
    evidenceRef: text(record.evidenceRef, "evidence_ref", 1000),
    lineageKey: text(record.lineageKey, "lineage_key", 1000),
  }));

  const firstByEvidence = new Map<string, InvestigationInformationRecord>();
  for (const record of info.sort((a, b) =>
    Date.parse(a.availableAt) - Date.parse(b.availableAt))) {
    if (!firstByEvidence.has(record.evidenceRef)) {
      firstByEvidence.set(record.evidenceRef, record);
    }
  }

  const before = info.filter((record) =>
    Date.parse(record.availableAt) <= Date.parse(decisionAt));
  const after = info.filter((record) =>
    Date.parse(record.availableAt) > Date.parse(decisionAt));

  const beforeRefs = new Set(before.map((record) => record.evidenceRef));
  return {
    decisionId,
    availableBeforeDecision: [
      ...new Set(before.map((record) => record.infoKey)),
    ].sort(),
    firstDocumentedAfterDecision: [
      ...new Set(after.map((record) => record.infoKey)),
    ].sort(),
    citedBasisAvailableBeforeDecision: citedBasisRefs
      .filter((ref) => beforeRefs.has(ref))
      .sort(),
    citedBasisNotDocumentedBeforeDecision: citedBasisRefs
      .filter((ref) => !beforeRefs.has(ref))
      .sort(),
    evidenceRefs: [
      ...new Set([
        decisionEvidenceRef,
        ...info.map((record) => record.evidenceRef),
      ]),
    ].sort(),
    note:
      "Decision provenance separates what is documented as available at the time from later knowledge; it does not infer motive or competence.",
  };
}
