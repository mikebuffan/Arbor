import { describe, expect, it } from "vitest";
import { verifyResearchCompletion } from "./completionVerification";
import type { ResearchSession, ResearchUnitReceipt } from "./sessionPolicy";

const session: ResearchSession = {
  id: "s1", userId: "u1", projectId: "p1", objective: "verify bounded public-record research",
  status: "running", startedAt: "2026-09-22T00:00:00.000Z", deadlineAt: "2026-09-22T01:00:00.000Z",
  maxWorkUnits: 10, consumedWorkUnits: 2, maxCostCents: 100, committedCostCents: 0,
  authorized: true, cancellationRequested: false, unresolvedRequiredWork: 0,
  completedEvidenceRefs: ["ev:a", "ev:b"],
};

const receipt = (overrides: Partial<ResearchUnitReceipt> = {}): ResearchUnitReceipt => ({
  sessionId: "s1", unitId: "unit-1", idempotencyKey: "idem-1", status: "completed",
  recordedAt: "2026-09-22T00:20:00.000Z", costCents: 0, evidenceRefs: ["ev:a", "ev:b"],
  unresolvedRequiredWork: 0, ...overrides,
});

describe("verifyResearchCompletion", () => {
  it("verifies only when completed receipts cover every required evidence ref", () => {
    expect(verifyResearchCompletion({ session, receipts: [receipt()], requiredEvidenceRefs: ["ev:b", "ev:a"] }))
      .toEqual({ verified: true, evidenceRefs: ["ev:a", "ev:b"] });
  });

  it("does not treat zero unresolved work or an empty queue as completion without receipts", () => {
    expect(verifyResearchCompletion({ session, receipts: [], requiredEvidenceRefs: ["ev:a"] }))
      .toEqual({ verified: false, reason: "no_completed_receipts" });
  });

  it("rejects missing required evidence even when a completed receipt exists", () => {
    expect(verifyResearchCompletion({ session, receipts: [receipt({ evidenceRefs: ["ev:a"] })], requiredEvidenceRefs: ["ev:a", "ev:b"] }))
      .toEqual({ verified: false, reason: "missing_required_evidence" });
  });

  it("rejects completion while required work remains", () => {
    expect(verifyResearchCompletion({ session: { ...session, unresolvedRequiredWork: 1 }, receipts: [receipt()], requiredEvidenceRefs: ["ev:a"] }))
      .toEqual({ verified: false, reason: "required_work_remaining" });
  });

  it("rejects a completed receipt that still reports unresolved work", () => {
    expect(verifyResearchCompletion({ session, receipts: [receipt({ unresolvedRequiredWork: 1 })], requiredEvidenceRefs: ["ev:a"] }))
      .toEqual({ verified: false, reason: "unresolved_receipt" });
  });

  it("ignores checkpoint/failed evidence as completion proof", () => {
    expect(verifyResearchCompletion({ session, receipts: [receipt({ status: "checkpointed" })], requiredEvidenceRefs: ["ev:a"] }))
      .toEqual({ verified: false, reason: "no_completed_receipts" });
  });

  it("rejects empty and duplicate required evidence refs", () => {
    expect(() => verifyResearchCompletion({ session, receipts: [receipt()], requiredEvidenceRefs: [""] })).toThrow("invalid_required_evidence_ref");
    expect(() => verifyResearchCompletion({ session, receipts: [receipt()], requiredEvidenceRefs: ["ev:a", "ev:a"] })).toThrow("duplicate_required_evidence_ref");
  });
});
