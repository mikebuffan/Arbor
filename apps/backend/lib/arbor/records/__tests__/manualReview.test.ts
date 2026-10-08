import { describe, expect, it } from "vitest";
import {
  reviewContributionEvidence,
  reviewManualRecordIntake,
  type ContributionEvidence,
  type ManualRecordIntake,
} from "@/lib/arbor/records/manualReview";

const contribution = (
  id: string,
  overrides: Partial<ContributionEvidence> = {},
): ContributionEvidence => ({
  id,
  projectId: "project-one",
  contributorLabel: "Contributor A",
  contributionType: "testing",
  artifactRef: "commit-abc",
  observedWork: "Reviewed regression tests",
  ...overrides,
});

const record = (
  id: string,
  overrides: Partial<ManualRecordIntake> = {},
): ManualRecordIntake => ({
  id,
  projectId: "project-one",
  documentRef: "local-record-pointer-1",
  statedPurpose: "Review historical record provenance",
  ownerApprovedToReview: true,
  privacyClass: "ordinary",
  ...overrides,
});

describe("Group 15 project contribution evidence review", () => {
  it("leaves verified-looking source attribution as a review candidate, not IP ownership", () => {
    const result = reviewContributionEvidence("project-one", [contribution("e1")]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      result: "review_candidate",
      reason: "source_reference_requires_independent_review",
      legalOwnershipEstablished: false,
    });
    expect(result.legalOwnershipEstablished).toBe(false);
    expect(result.financialAuthorizationGranted).toBe(false);
  });

  it("holds foreign-project entries even with matching artifact references", () => {
    const result = reviewContributionEvidence("project-one", [
      contribution("e1", { projectId: "project-other" }),
    ]);
    expect(result.candidates).toHaveLength(0);
    expect(result.held[0].reason).toBe("wrong_project_scope");
  });

  it("does not double count different claim IDs using one contributor/source", () => {
    const result = reviewContributionEvidence("project-one", [
      contribution("e1"),
      contribution("e2"),
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.held[0].reason).toBe("same_attribution_source_not_independent");
  });

  it("holds empty source or observed-work evidence instead of guessing", () => {
    const result = reviewContributionEvidence("project-one", [
      contribution("e1", { artifactRef: "" }),
      contribution("e2", { observedWork: "" }),
    ]);
    expect(result.held.map(x => x.reason)).toEqual([
      "missing_source_or_attribution",
      "missing_source_or_attribution",
    ]);
  });

  it("preserves contributed evidence without rewriting its content", () => {
    const rows = [Object.freeze(contribution("e1")), Object.freeze(contribution("e2"))];
    const before = JSON.stringify(rows);
    reviewContributionEvidence("project-one", rows);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("refuses unbounded or unspecified project-scoped contributor review", () => {
    expect(() => reviewContributionEvidence("", [])).toThrow("contribution_project_required");
    expect(() => reviewContributionEvidence("project-one",
      Array.from({ length: 101 }, (_, i) => contribution(String(i))))).toThrow("contribution_review_limit");
  });
});

describe("Group 15 optional manual practical-record intake", () => {
  it("allows metadata-only human review, not automatic import or retention", () => {
    const result = reviewManualRecordIntake("project-one", [record("r1")]);
    expect(result.items[0]).toMatchObject({
      status: "human_review_ready",
      contentsOpened: false,
      recordImported: false,
      retentionApproved: false,
      legalActionExecuted: false,
    });
    expect(result.performedExternalActions).toBe(false);
  });

  it("blocks records lacking explicit human consent to review", () => {
    const result = reviewManualRecordIntake("project-one", [
      record("r1", { ownerApprovedToReview: false }),
    ]);
    expect(result.items[0].blockers).toContain("owner_review_consent_absent");
    expect(result.items[0].status).toBe("blocked");
  });

  it("fails closed on sensitive and unknown privacy scopes", () => {
    for (const privacyClass of ["restricted", "unknown"] as const) {
      const result = reviewManualRecordIntake("project-one", [
        record("r1", { privacyClass }),
      ]);
      expect(result.items[0].status).toBe("blocked");
      expect(result.items[0].blockers).toContain("privacy_review_required");
    }
  });

  it("holds cross-project record references and duplicate intake IDs", () => {
    const result = reviewManualRecordIntake("project-one", [
      record("r1", { projectId: "project-two" }),
      record("r1"),
    ]);
    expect(result.items[0].blockers).toContain("wrong_project_scope");
    expect(result.items[1].blockers).toContain("duplicate_intake_id");
    expect(result.items.every(i => i.recordImported === false)).toBe(true);
  });

  it("retains no source bodies and never claims an external action", () => {
    const input = Object.freeze(record("r1", { documentRef: "opaque-reference" }));
    const before = JSON.stringify(input);
    const result = reviewManualRecordIntake("project-one", [input]);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(result)).not.toContain("documentContent");
    expect(result.authority).toBe("metadata_only_review");
  });

  it("refuses unbounded intake and empty project scope", () => {
    expect(() => reviewManualRecordIntake("", [])).toThrow("record_intake_project_required");
    expect(() => reviewManualRecordIntake("project-one",
      Array.from({ length: 101 }, (_, i) => record(String(i))))).toThrow("record_intake_review_limit");
  });
});
