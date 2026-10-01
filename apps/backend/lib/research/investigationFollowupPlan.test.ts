import { describe, expect, it } from "vitest";
import { planInvestigationFollowups, selectPersistedFollowupUnits, type InvestigationFollowupPacket } from "./investigationFollowupPlan";
import { buildInvestigationCaseworkUnitHandler } from "./investigationCaseworkUnit";
import type { ResearchSession } from "./sessionPolicy";

const target = {
  targetKey: "original-slips", seed: "synthetic original message slips",
  completionCondition: "Compare original scans and carbon-copy characteristics",
  fallback: "Acquire evidence inventory and adjacent dated pages",
  disconfirmingSearch: "Test whether the two slips reproduce one message",
  expectedDecisionChange: 5, resolvesUncertainty: 5, addsIndependentLineage: 2,
  acquisitionEffort: 2, maxCostReservationCents: 0,
};
function fixture(): InvestigationFollowupPacket {
  const unknown = { value: null, precision: "unknown" as const, evidenceRefs: ["slips"] };
  return {
    scopeKey: "owner/project",
    questions: [{ id: "call-count", question: "One message or two distinct calls?",
      evidenceRefs: ["slips"], sourceRevision: "release-1", targets: [target] }],
    attempts: [],
    clocks: [{ recordId: "slips", event: unknown, document: unknown,
      seizure: { value: "2005-10", precision: "month", evidenceRefs: ["inventory"] },
      publication: { value: "2019", precision: "year", evidenceRefs: ["report"] },
      discovery: { value: "2026-09-27", precision: "day", evidenceRefs: ["receipt"] } }],
    neighborhoods: [{ documentVersion: "original-scan-v1", physicalPage: 1, totalPages: 4,
      radius: 2, evidenceRefs: ["slips"], attachments: ["evidence-inventory"] }],
    gaps: [{ expectedRecord: "sale transcript", expectationEvidenceRefs: ["order"],
      collectionScope: "synthetic court release", coverage: "partial",
      manifestEvidenceRefs: [], searchComplete: true }],
    findings: [{ id: "two-calls", evidenceRefs: ["old-slips"], dependsOnFindingIds: [] },
      { id: "continued-contact", evidenceRefs: ["report"], dependsOnFindingIds: ["two-calls"] },
      { id: "rupture-date", evidenceRefs: ["order"], dependsOnFindingIds: ["continued-contact"] }],
    corrections: [{ id: "carbon-copy", supersededEvidenceRef: "old-slips",
      replacementEvidenceRefs: ["slips"], reason: "Distinct call count unresolved" }],
  };
}

describe("evidence follow-up planning", () => {
  it("creates bounded actionable work and ranks original evidence ahead of repetitive reporting", () => {
    const p = fixture();
    p.questions[0].targets.push({ ...target, targetKey: "another-article",
      expectedDecisionChange: 0, resolvesUncertainty: 0, addsIndependentLineage: 0 });
    const result = planInvestigationFollowups(p);
    expect(result.jobs[0].unit.payload.seed).toBe(target.seed);
    expect(result.proposedUnits[0]).toMatchObject({ kind: "research.pattern_hop", maxAttempts: 2,
      payload: { maxDepth: 2, maxHopsPerAttempt: 2, basisEvidenceRefs: ["slips"] } });
    expect(result.jobs[0].completionCondition).toBe(target.completionCondition);
    expect(result.executionStarted).toBe(false);
  });
  it("preserves unknown event dates despite known seizure and publication dates", () => {
    const r = planInvestigationFollowups(fixture());
    expect(r.clocks[0].event.value).toBeNull();
    expect(r.clocks[0].seizure.value).toBe("2005-10");
    expect(r.neighborhoods[0].physicalPages).toEqual([1, 2, 3]);
    expect(r.neighborhoods[0].proximityEstablishesConnection).toBe(false);
  });
  it("holds direct and transitive findings without modifying prior findings", () => {
    const p = fixture(); const original = JSON.stringify(p);
    const result = planInvestigationFollowups(p);
    expect(result.correctionReviews[0].affectedFindingIds).toEqual([
      "continued-contact", "rupture-date", "two-calls"]);
    expect(JSON.stringify(p)).toBe(original);
    expect(result.independentlyVerifiedFinding).toBe(false);
  });
  it("distinguishes partial coverage from complete scoped non-discovery", () => {
    const p = fixture();
    expect(planInvestigationFollowups(p).gapReviews[0].status).toBe("coverage_or_search_incomplete");
    p.gaps[0].coverage = "complete";
    expect(() => planInvestigationFollowups(p)).toThrow();
    p.gaps[0].manifestEvidenceRefs = ["manifest"];
    expect(planInvestigationFollowups(p).gapReviews[0]).toMatchObject({
      status: "not_found_in_documented_scope", provesNonexistence: false });
    p.gaps[0].searchComplete = false;
    expect(planInvestigationFollowups(p).gapReviews[0].status).toBe("coverage_or_search_incomplete");
  });
  it.each(["completed", "queued", "leased", "blocked", "failed"] as const)(
    "resumes without repeating %s work", status => {
      const p = fixture();
      const key = planInvestigationFollowups(p).jobs[0].unitKey;
      p.attempts = [{ unitKey: key, status, recordedAt: "2026-10-01T00:00:00Z",
        reason: "Synthetic persisted receipt", resultEvidenceRefs: [] }];
      p.questions[0].question = "Reworded same question";
      expect(planInvestigationFollowups(JSON.parse(JSON.stringify(p))).proposedUnits).toEqual([]);
      p.questions[0].sourceRevision = "newly-available-originals";
      expect(planInvestigationFollowups(p).proposedUnits).toHaveLength(1);
    });
  it("rejects dependency cycles, unknown dependencies, and duplicate targets", () => {
    const p = fixture();
    p.findings[0].dependsOnFindingIds = ["rupture-date"];
    expect(() => planInvestigationFollowups(p)).toThrow("followup_circular_finding_dependency");
    p.findings[0].dependsOnFindingIds = ["unknown"];
    expect(() => planInvestigationFollowups(p)).toThrow("followup_unknown_finding_dependency");
    p.findings[0].dependsOnFindingIds = [];
    p.questions[0].targets.push(target);
    expect(() => planInvestigationFollowups(p)).toThrow("followup_duplicate_target");
  });
  it("bounds appends to eight while preserving the full ranked frontier", () => {
    const p = fixture();
    p.questions[0].targets = Array.from({ length: 12 }, (_, i) => ({ ...target, targetKey: `t${i}` }));
    const r = planInvestigationFollowups(p);
    expect(r.proposedUnits).toHaveLength(8);
    expect(r.jobs).toHaveLength(12);
    expect(r.remainingReadyJobs).toBe(4);
    expect(planInvestigationFollowups(p)).toEqual(r);
  });
  it("respects cumulative budget and rejects tampered persisted authority", () => {
    const p = fixture();
    p.questions[0].targets = [target, { ...target, targetKey: "second", maxCostReservationCents: 4 },
      { ...target, targetKey: "third", maxCostReservationCents: 4 }];
    const output = planInvestigationFollowups(p);
    const context = { session: { userId: "owner", projectId: "project", completedEvidenceRefs: ["slips"],
      maxCostCents: 5, committedCostCents: 0 } as ResearchSession, units: [],
      recentReceipts: [{ unitKey: "plan", status: "completed" as const, evidenceRefs: ["slips"],
        recordedAt: "2026-10-01T00:00:00Z", result: { caseworkKind: "followup_plan", caseworkOutput: output } }] };
    const units = selectPersistedFollowupUnits(context);
    expect(units.reduce((sum, u) => sum + u.maxCostReservationCents, 0)).toBeLessThanOrEqual(5);
    output.jobs[0].unit.payload.toolAuthority = "widen-source-access";
    expect(() => selectPersistedFollowupUnits(context)).toThrow();
    delete output.jobs[0].unit.payload.toolAuthority;
    output.jobs[0].unit.payload.basisEvidenceRefs = ["forged"];
    expect(() => selectPersistedFollowupUnits(context)).toThrow("followup_untrusted_persisted_basis");
  });

  it("persists through the existing trusted casework receipt and rejects nested evidence outside its envelope", async () => {
    const payload = fixture();
    const refs = ["slips", "inventory", "report", "receipt", "order", "old-slips"];
    const session: ResearchSession = { id: "session", userId: "owner", projectId: "project",
      objective: "synthetic", status: "running", startedAt: "2026-10-01T00:00:00Z",
      deadlineAt: "2026-10-01T01:00:00Z", maxWorkUnits: 20, consumedWorkUnits: 0,
      maxCostCents: 100, committedCostCents: 0, authorized: true, cancellationRequested: false,
      unresolvedRequiredWork: 2, completedEvidenceRefs: refs };
    const args = { session, claim: { unitId: "unit", kind: "research.casework",
      payload: { packetId: "packet" }, leaseToken: "lease", idempotencyKey: "once" },
      at: "2026-10-01T00:01:00Z", remainingMs: 60000, remainingCostCents: 100 };
    const store = { loadPacket: async () => ({ id: "packet", kind: "followup_plan" as const,
      evidenceRefs: refs, payload }) };
    const r = await buildInvestigationCaseworkUnitHandler(store)(args);
    expect(r.result).toMatchObject({ caseworkKind: "followup_plan", independentlyVerifiedFinding: false });
    const restored = JSON.parse(JSON.stringify(r));
    const context = { session, units: [], recentReceipts: [{ unitKey: "casework", status: "completed" as const,
      evidenceRefs: refs, recordedAt: args.at, result: restored.result }] };
    const units = selectPersistedFollowupUnits(context);
    expect(units).toHaveLength(1);
    expect(selectPersistedFollowupUnits({ ...context, units: [{ unitKey: units[0].unitKey,
      kind: units[0].kind, status: "completed", attemptCount: 1, maxAttempts: 2 }] })).toEqual([]);
    expect(() => selectPersistedFollowupUnits({ ...context, session: { ...session, userId: "other" } }))
      .toThrow("followup_invalid_persisted_plan");
    expect(restored.result.caseworkOutput.proposedUnits).toHaveLength(1);
    payload.questions[0].evidenceRefs = ["not-in-envelope"];
    await expect(buildInvestigationCaseworkUnitHandler(store)(args)).rejects.toThrow("untrusted_nested_evidence");
  });
});
