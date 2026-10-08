import { describe, expect, it } from "vitest";
import {
  diffDecisionAncestry, projectDecisionAncestry,
  projectDecisionReviewCandidates, type DecisionTrailEvent,
} from "../decisionAncestry";
import { projectDiscoveryRadar, type DiscoveryMetadata } from "../discoveryRadar";

const scope = { userId: "fixture-owner", projectId: "fixture-project" };
const decisionEvent = (
  id: string, kind: DecisionTrailEvent["kind"],
  changes: Partial<DecisionTrailEvent> = {},
): DecisionTrailEvent => ({
  ...scope, id, decisionId: "synthetic-decision",
  occurredAt: "2026-10-07T12:00:00.000Z",
  kind, summary: `synthetic ${kind}`, evidenceRefs: [],
  ...changes,
});
const trail = (events: DecisionTrailEvent[]) => projectDecisionAncestry({
  scope, decisionId: "synthetic-decision", events,
});
const discovery = (
  id: string, changes: Partial<DiscoveryMetadata> = {},
): DiscoveryMetadata => ({
  ...scope, sourceFamilyId: "family-" + id,
  retrievalScore: 0.96, retrievalMethod: "synthetic",
  evidence: {
    id, source: "fixture-ref-" + id, evidenceType: "metadata",
    content: "Correction continuity runtime acceptance evidence",
    confidence: 0.96, epistemicStatus: "direct",
  },
  ...changes,
});
const radar = (
  candidates: DiscoveryMetadata[], visitedEvidenceIds: unknown = [],
) => projectDiscoveryRadar({
  scope, seed: discovery("seed"), candidates,
  authorizedProjectIds: [scope.projectId],
  visitedEvidenceIds: visitedEvidenceIds as string[],
});

describe("Group 11 forged-view decision ancestry protection", () => {
  it("rejects injected reported outcomes in both Human Inbox and What Changed", () => {
    const authentic = trail([
      decisionEvent("choice", "choice"),
      decisionEvent("outcome", "observed_outcome", { evidenceRefs: ["reported-ref"] }),
    ]);
    const forged = { ...authentic, reportedOutcomeRefs: ["invented-success"] };
    expect(() => projectDecisionReviewCandidates({ scope, views: [forged] }))
      .toThrow("decision_ancestry_view_invalid");
    expect(() => diffDecisionAncestry(authentic, forged))
      .toThrow("decision_ancestry_view_invalid");
    expect(authentic.evidenceVerifiedHere).toBe(false);
    expect(authentic.grantsExecution).toBe(false);
  });

  it("rejects same-ID choice payload and fabricated choice on otherwise valid event IDs", () => {
    const authentic = trail([decisionEvent("choice", "choice", {
      evidenceRefs: ["original-source"],
    })]);
    const forged = {
      ...authentic,
      currentChoice: { ...authentic.currentChoice!, summary: "a fabricated completed decision",
        evidenceRefs: ["invented-source"] },
    };
    expect(() => projectDecisionReviewCandidates({ scope, views: [forged] }))
      .toThrow("decision_ancestry_view_invalid");
    expect(() => diffDecisionAncestry(authentic, forged))
      .toThrow("decision_ancestry_view_invalid");
  });

  it("accepts consistent reported-source views without treating the sources as authenticated", () => {
    const valid = trail([
      decisionEvent("choice", "choice"),
      decisionEvent("outcome", "observed_outcome", { evidenceRefs: ["host-reported"] }),
    ]);
    expect(projectDecisionReviewCandidates({ scope, views: [valid] }).grantsExecution)
      .toBe(false);
    expect(diffDecisionAncestry(valid, valid).addedEventIds).toEqual([]);
    expect(valid.reportedOutcomeRefs).toEqual(["host-reported"]);
    expect(valid.evidenceVerifiedHere).toBe(false);
  });

  it("rejects foreign project and concurrent duplicate conflicts before projecting reviews", () => {
    expect(() => trail([decisionEvent("foreign", "choice", { projectId: "unowned" })]))
      .toThrow("decision_ancestry_scope_mismatch");
    expect(() => trail([decisionEvent("same", "choice"),
      decisionEvent("same", "choice", { summary: "conflict" })]))
      .toThrow("decision_ancestry_duplicate_conflict");
  });
});

describe("Group 11 Discovery Radar visited input and scope boundaries", () => {
  it("rejects oversized, non-string, blank and overlong visited IDs", () => {
    expect(() => radar([discovery("next")], Array.from({length: 129}, (_, i) => "v" + i)))
      .toThrow("discovery_radar_invalid_visited_ids");
    for (const bad of [[null], [12], [" "], ["x".repeat(201)], ["v", "v"]]) {
      expect(() => radar([discovery("next")], bad))
        .toThrow("discovery_radar_invalid_visited_ids");
    }
  });

  it("accepts 128 valid prior IDs without changing the existing candidate scoring", () => {
    const normal = radar([discovery("next")]);
    const atLimit = radar([discovery("next")],
      Array.from({length: 128}, (_, i) => "visited-" + i));
    expect(atLimit.suggestions).toEqual(normal.suggestions);
    expect(atLimit.grantsExecution).toBe(false);
    expect(atLimit.createsTasks).toBe(false);
    expect(atLimit.permissionVerifiedHere).toBe(false);
    expect(atLimit.discoveryVerifiedHere).toBe(false);
  });

  it("still excludes visited evidence and denies unapproved foreign project data", () => {
    expect(radar([discovery("visited")], ["visited"]).suggestions).toEqual([]);
    expect(() => radar([discovery("foreign", { projectId: "different" })]))
      .toThrow("discovery_radar_access_denied");
  });

  it("keeps family dedupe from implying independent corroboration", () => {
    const one = discovery("one", { sourceFamilyId: "same" });
    const two = discovery("two", { sourceFamilyId: "same", retrievalScore: .85 });
    const result = radar([one, two]);
    expect(result.repeatedFamilyCount).toBe(1);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].corroborationVerified).toBe(false);
  });
});
