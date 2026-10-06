export const INVESTIGATION_EVIDENCE_CLASSES = [
  "PRIMARY_RECORD",
  "DIRECT_RECORDING",
  "SWORN_FIRSTHAND",
  "ATTRIBUTED_STATEMENT",
  "SECONDHAND_STATEMENT",
  "MEDIA_SUMMARY",
  "PROCEDURAL_LITIGATION_POSITION",
  "ALLEGATION",
  "INFERENCE",
] as const;

export type InvestigationEvidenceClass =
  typeof INVESTIGATION_EVIDENCE_CLASSES[number];

export const INVESTIGATION_ASSERTION_KINDS = [
  "direct_confession",
  "direct_admission",
  "established_act",
  "attributed_statement",
  "procedural_position",
  "relationship",
  "inference",
  "absence",
] as const;

export type InvestigationAssertionKind =
  typeof INVESTIGATION_ASSERTION_KINDS[number];

export type NegativeEvidenceState =
  | "NOT_FOUND_IN_SEARCHED_SCOPE"
  | "SOURCE_SILENT"
  | "EXPECTED_BUT_MISSING"
  | "PROVEN_ABSENT";

export type InvestigationEvidenceAtom = {
  id: string;
  evidenceClass: InvestigationEvidenceClass;
  sourceRef: string;
  lineageKey: string;
  content: string;
  contentSha256: string;
  supports: InvestigationAssertionKind[];
  underlyingSourceRef?: string | null;
};

export type FalsificationAttempt = {
  id: string;
  hypothesis: string;
  /** Outcome is always relative to the current claim, not the adversarial hypothesis. */
  result: "claim_survived" | "claim_failed" | "inconclusive";
  evidenceRefs: string[];
};

export type InvestigationFindingDraft = {
  claimId: string;
  claimText: string;
  assertionKind: InvestigationAssertionKind;
  support: InvestigationEvidenceAtom[];
  counterEvidenceRefs: string[];
  unresolvedContradictionIds: string[];
  falsificationAttempts: FalsificationAttempt[];
  negativeEvidence?: {
    state: NegativeEvidenceState;
    scope: string;
    proofRef?: string | null;
  } | null;
};

export type InvestigationIntegrityDecision = {
  status: "promotable" | "hold";
  reasons: string[];
  independentLineages: number;
  primarySourceLeads: string[];
};

const secondaryClasses = new Set<InvestigationEvidenceClass>([
  "ATTRIBUTED_STATEMENT",
  "SECONDHAND_STATEMENT",
  "MEDIA_SUMMARY",
  "ALLEGATION",
]);

const directAdmissionClasses = new Set<InvestigationEvidenceClass>([
  "PRIMARY_RECORD",
  "DIRECT_RECORDING",
]);

const eventCapableClasses = new Set<InvestigationEvidenceClass>([
  "PRIMARY_RECORD",
  "DIRECT_RECORDING",
  "SWORN_FIRSTHAND",
]);

function nonEmpty(value: string, field: string): string {
  const clean = value.trim();
  if (!clean) throw new Error("investigation_integrity_" + field + "_required");
  return clean;
}

export function validateInvestigationEvidenceAtom(
  evidence: InvestigationEvidenceAtom,
): InvestigationEvidenceAtom {
  nonEmpty(evidence.id, "evidence_id");
  nonEmpty(evidence.sourceRef, "source_ref");
  nonEmpty(evidence.lineageKey, "lineage_key");
  nonEmpty(evidence.content, "content");
  if (!/^[0-9a-f]{64}$/.test(evidence.contentSha256)) {
    throw new Error("investigation_integrity_invalid_content_sha256");
  }

  if (!INVESTIGATION_EVIDENCE_CLASSES.includes(evidence.evidenceClass)) {
    throw new Error("investigation_integrity_invalid_evidence_class");
  }
  if (!Array.isArray(evidence.supports) || !evidence.supports.length ||
      evidence.supports.some((kind) => !INVESTIGATION_ASSERTION_KINDS.includes(kind))) {
    throw new Error("investigation_integrity_invalid_supports");
  }

  return {
    ...evidence,
    id: evidence.id.trim(),
    sourceRef: evidence.sourceRef.trim(),
    lineageKey: evidence.lineageKey.trim(),
    content: evidence.content.trim(),
    contentSha256: evidence.contentSha256,
    underlyingSourceRef: evidence.underlyingSourceRef?.trim() || null,
    supports: [...new Set(evidence.supports)],
  };
}

export function countIndependentLineages(
  evidence: InvestigationEvidenceAtom[],
): number {
  return new Set(
    evidence.map((item) => validateInvestigationEvidenceAtom(item).lineageKey),
  ).size;
}

export function primarySourceLeads(
  evidence: InvestigationEvidenceAtom[],
): string[] {
  const leads = new Set<string>();
  for (const raw of evidence) {
    const item = validateInvestigationEvidenceAtom(raw);
    if (!secondaryClasses.has(item.evidenceClass)) continue;
    if (item.underlyingSourceRef) continue;
    leads.add(
      "Locate the underlying primary source for " +
      item.sourceRef +
      " before using it to promote a finding.",
    );
  }
  return [...leads];
}

function hasExplicitSupport(
  draft: InvestigationFindingDraft,
  predicate: (evidence: InvestigationEvidenceAtom) => boolean,
): boolean {
  return draft.support.some((raw) => {
    const evidence = validateInvestigationEvidenceAtom(raw);
    return (
      evidence.supports.includes(draft.assertionKind) &&
      predicate(evidence)
    );
  });
}

function requiresFalsification(kind: InvestigationAssertionKind): boolean {
  return (
    kind === "established_act" ||
    kind === "relationship" ||
    kind === "inference"
  );
}

export function evaluateInvestigationIntegrity(
  draft: InvestigationFindingDraft,
): InvestigationIntegrityDecision {
  nonEmpty(draft.claimId, "claim_id");
  nonEmpty(draft.claimText, "claim_text");

  if (!INVESTIGATION_ASSERTION_KINDS.includes(draft.assertionKind)) {
    throw new Error("investigation_integrity_invalid_assertion_kind");
  }

  const support = draft.support.map(validateInvestigationEvidenceAtom);
  const reasons: string[] = [];

  if (!support.length) {
    reasons.push("no_supporting_evidence");
  }

  if (
    support.length > 0 &&
    !support.some((item) => item.supports.includes(draft.assertionKind))
  ) {
    reasons.push("support_does_not_match_assertion_kind");
  }

  if (
    (draft.assertionKind === "direct_confession" ||
      draft.assertionKind === "direct_admission") &&
    !hasExplicitSupport(draft, (item) =>
      directAdmissionClasses.has(item.evidenceClass))
  ) {
    reasons.push("direct_admission_requires_primary_or_recorded_support");
  }

  if (
    draft.assertionKind === "established_act" &&
    !hasExplicitSupport(draft, (item) =>
      eventCapableClasses.has(item.evidenceClass))
  ) {
    reasons.push("established_act_requires_primary_direct_or_sworn_firsthand_support");
  }

  if (
    draft.assertionKind === "procedural_position" &&
    !hasExplicitSupport(draft, (item) =>
      item.evidenceClass === "PROCEDURAL_LITIGATION_POSITION" ||
      item.evidenceClass === "PRIMARY_RECORD")
  ) {
    reasons.push("procedural_position_requires_procedural_or_primary_record");
  }

  if (
    support.length > 0 &&
    support.every((item) => secondaryClasses.has(item.evidenceClass)) &&
    !(
      draft.assertionKind === "attributed_statement" ||
      draft.assertionKind === "inference"
    )
  ) {
    reasons.push("secondary_only_support_cannot_promote_direct_fact");
  }

  if (draft.unresolvedContradictionIds.length > 0) {
    reasons.push("unresolved_contradictions_present");
  }

  if (draft.counterEvidenceRefs.length > 0) {
    const survivedCounterRefs = new Set(
      draft.falsificationAttempts
        .filter((attempt) => attempt.result === "claim_survived")
        .flatMap((attempt) => attempt.evidenceRefs),
    );
    if (draft.counterEvidenceRefs.some((ref) => !survivedCounterRefs.has(ref))) {
      reasons.push("counterevidence_requires_explicit_resolution");
    }
  }

  if (
    requiresFalsification(draft.assertionKind) &&
    draft.falsificationAttempts.length === 0
  ) {
    reasons.push("falsification_attempt_required");
  }
  if (draft.falsificationAttempts.some(
    (attempt) => attempt.result === "claim_failed",
  )) {
    reasons.push("falsification_failed_claim");
  }
  if (draft.falsificationAttempts.some(
    (attempt) => attempt.result === "inconclusive",
  )) {
    reasons.push("falsification_inconclusive");
  }

  if (
    draft.assertionKind === "absence" &&
    (
      !draft.negativeEvidence ||
      draft.negativeEvidence.state !== "PROVEN_ABSENT" ||
      !draft.negativeEvidence.proofRef?.trim()
    )
  ) {
    reasons.push("absence_claim_not_proven");
  }

  if (
    draft.assertionKind !== "absence" &&
    draft.negativeEvidence?.state === "PROVEN_ABSENT"
  ) {
    reasons.push("negative_evidence_state_mismatched_to_claim");
  }

  return {
    status: reasons.length ? "hold" : "promotable",
    reasons,
    independentLineages: countIndependentLineages(support),
    primarySourceLeads: primarySourceLeads(support),
  };
}

export function assertInvestigationFindingPromotable(
  draft: InvestigationFindingDraft,
): void {
  const decision = evaluateInvestigationIntegrity(draft);
  if (decision.status !== "promotable") {
    throw new Error(
      "investigation_integrity_hold:" + decision.reasons.join(","),
    );
  }
}
