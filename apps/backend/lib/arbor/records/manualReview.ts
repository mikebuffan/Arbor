/**
 * Group 15: source-only project-credit and practical-record intake reviews.
 *
 * Does not read document content, authenticate a caller, issue permissions,
 * persist a diary/record, award legal ownership, infer health status,
 * initiate financial transactions or execute an ARK task.
 *
 * A trusted host must independently enforce actual owner/project grants.
 */
export type ContributionEvidence = {
  id: string;
  projectId: string;
  contributorLabel: string;
  contributionType: "design" | "source" | "testing" | "editing" | "research" | "operations";
  artifactRef: string;
  observedWork: string;
};

export type ContributionReview = {
  evidenceId: string;
  contributorLabel: string;
  contributionType: ContributionEvidence["contributionType"];
  artifactRef: string;
  result: "review_candidate" | "hold";
  reason: string;
  legalOwnershipEstablished: false;
};

export type AttributionReview = {
  projectId: string;
  candidates: ContributionReview[];
  held: ContributionReview[];
  authority: "review_only";
  legalOwnershipEstablished: false;
  financialAuthorizationGranted: false;
};

function cleaned(text: string | null | undefined): string {
  return (text ?? "").trim();
}

/**
 * Collect evidence-backed *attribution candidates*, NOT ownership,
 * contractual rights, licensing terms, financing or legal conclusions.
 */
export function reviewContributionEvidence(
  projectId: string,
  rows: readonly ContributionEvidence[],
): AttributionReview {
  if (!cleaned(projectId)) throw new Error("contribution_project_required");
  if (rows.length > 100) throw new Error("contribution_review_limit");

  const candidates: ContributionReview[] = [];
  const held: ContributionReview[] = [];
  const seenIds = new Set<string>();
  const seenClaims = new Set<string>();

  for (const row of rows) {
    const id = cleaned(row.id);
    const artifactRef = cleaned(row.artifactRef);
    const contributor = cleaned(row.contributorLabel);
    const work = cleaned(row.observedWork);
    const sameScope = cleaned(row.projectId) === projectId;
    const identityKey = [projectId, contributor.toLowerCase(), row.contributionType, artifactRef].join("::");
    let reason: string | null = null;
    if (!sameScope) reason = "wrong_project_scope";
    else if (!id || !artifactRef || !contributor || !work) reason = "missing_source_or_attribution";
    else if (seenIds.has(id)) reason = "repeated_record_id";
    else if (seenClaims.has(identityKey)) reason = "same_attribution_source_not_independent";

    const review: ContributionReview = {
      evidenceId: id,
      contributorLabel: contributor,
      contributionType: row.contributionType,
      artifactRef,
      result: reason ? "hold" : "review_candidate",
      reason: reason ?? "source_reference_requires_independent_review",
      legalOwnershipEstablished: false,
    };
    if (reason) held.push(review);
    else candidates.push(review);

    if (sameScope && id) seenIds.add(id);
    if (sameScope && contributor && artifactRef && work) seenClaims.add(identityKey);
  }
  return {
    projectId,
    candidates,
    held,
    authority: "review_only",
    legalOwnershipEstablished: false,
    financialAuthorizationGranted: false,
  };
}

export type ManualRecordIntake = {
  id: string;
  projectId: string;
  documentRef: string;
  statedPurpose: string;
  ownerApprovedToReview: boolean;
  /**
   * Human-selected scope classification. Does NOT determine the record's
   * real privacy sensitivity; a trusted reviewer must verify.
   */
  privacyClass: "ordinary" | "restricted" | "unknown";
};

export type RecordIntakeReview = {
  id: string;
  documentRef: string;
  status: "blocked" | "human_review_ready";
  blockers: string[];
  contentsOpened: false;
  recordImported: false;
  retentionApproved: false;
  legalActionExecuted: false;
};

export type RecordIntakeBatchReview = {
  projectId: string;
  items: RecordIntakeReview[];
  authority: "metadata_only_review";
  performedExternalActions: false;
};

/**
 * A metadata-only planning step, deliberately no document reads.
 * Consent to *review* is not permission to import/store/share/act.
 */
export function reviewManualRecordIntake(
  projectId: string,
  proposals: readonly ManualRecordIntake[],
): RecordIntakeBatchReview {
  if (!cleaned(projectId)) throw new Error("record_intake_project_required");
  if (proposals.length > 100) throw new Error("record_intake_review_limit");
  const seen = new Set<string>();
  const items = proposals.map((proposal): RecordIntakeReview => {
    const id = cleaned(proposal.id);
    const documentRef = cleaned(proposal.documentRef);
    const blockers: string[] = [];
    if (cleaned(proposal.projectId) !== projectId) blockers.push("wrong_project_scope");
    if (!id || !documentRef || !cleaned(proposal.statedPurpose))
      blockers.push("missing_document_ref_or_purpose");
    if (id && seen.has(id)) blockers.push("duplicate_intake_id");
    if (!proposal.ownerApprovedToReview) blockers.push("owner_review_consent_absent");
    if (proposal.privacyClass !== "ordinary") blockers.push("privacy_review_required");
    if (id) seen.add(id);
    return {
      id,
      documentRef,
      status: blockers.length ? "blocked" : "human_review_ready",
      blockers,
      contentsOpened: false,
      recordImported: false,
      retentionApproved: false,
      legalActionExecuted: false,
    };
  });
  return { projectId, items, authority: "metadata_only_review", performedExternalActions: false };
}
