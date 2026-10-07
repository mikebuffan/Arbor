import { describe, expect, it } from "vitest";
import type { ClaimEvidenceSummary } from "./claimEvidenceGraph";
import type { PropagatedClaimConfidence } from "./contradictionPropagation";
import type { RerouteDirective } from "./failedLeadRouting";
import {
  preparePatternHopCandidate,
  type ResearchPatternHopCandidate,
} from "./researchPatternHopBridge";
import { preparePatternHopEvidenceIntegration } from "./patternHopEvidenceIntegration";

const scope = {
  userId: "owner",
  projectId: "project",
  conversationId: "conversation",
  turnId: "turn",
};

function candidate(
  overrides: Partial<ResearchPatternHopCandidate> = {},
): ResearchPatternHopCandidate {
  return {
    ...preparePatternHopCandidate({
      candidateId: "candidate-a",
      anomalyRef: "anomaly-a",
      objective: "Resolve one evidence-bound synthetic gap.",
      requestedQuery: "synthetic bounded evidence query",
      triggerEvidenceRefs: ["evidence-0", "evidence-1"],
      maxDepth: 3,
      maxHopsPerAttempt: 6,
    }),
    ...overrides,
  };
}

describe("Pattern Hop -> Evidence Engine -> Roundabout -> ARK composition", () => {
  it("preserves all provenance while chunking the existing Roundabout packet bound", () => {
    const supportRefs = Array.from(
      { length: 11 },
      (_, i) => "evidence-" + (i + 2),
    );
    const claims: ClaimEvidenceSummary[] = [{
      claimId: "claim-a",
      supportRefs,
      counterRefs: ["evidence-13"],
      contextRefs: ["evidence-1"],
      supportFamilies: ["family-support"],
      counterFamilies: ["family-counter"],
      status: "graph_not_verdict",
    }];
    const effects: PropagatedClaimConfidence[] = [{
      claimId: "claim-a",
      baseConfidence: 0.8,
      adjustedConfidence: 0.4,
      directContradictionSeverity: 0.5,
      propagatedFrom: [],
      evidenceRefs: ["evidence-13", "evidence-14"],
      status: "confidence_effect_not_verdict",
    }];

    const result = preparePatternHopEvidenceIntegration({
      candidate: candidate(),
      scope,
      projectId: "project",
      claimSummaries: claims,
      contradictionEffects: effects,
    });

    expect(result.signal).toBe("contradiction");
    expect(result.evidenceRefs).toHaveLength(15);
    expect(result.roundabout).toHaveLength(2);
    expect(result.roundabout.every(batch =>
      batch.route.decision === "hold" &&
      batch.route.reason === "contradiction_hold" &&
      batch.route.grantsExecution === false &&
      batch.route.requiresReview === true &&
      batch.evidenceRefs.length <= 12
    )).toBe(true);

    const routedRefs = [...new Set(
      result.roundabout.flatMap(batch => batch.evidenceRefs),
    )].sort();
    expect(routedRefs).toEqual(result.evidenceRefs);
    expect(result.evidenceRefs).toEqual(
      Array.from({ length: 15 }, (_, i) => "evidence-" + i).sort(),
    );
    expect(result.ark).toMatchObject({
      executionRequested: false,
      submitted: false,
      status: "prepared_not_submitted",
      independentCorroborationVerified: false,
      grantsExecution: false,
      request: {
        projectId: "project",
        seed: "synthetic bounded evidence query",
        runId: null,
        maxHops: 6,
        maxDepth: 3,
      },
    });
  });

  it("deduplicates provenance without treating repetition as independent corroboration", () => {
    const claims: ClaimEvidenceSummary[] = [{
      claimId: "claim-a",
      supportRefs: ["evidence-0", "evidence-0"],
      counterRefs: [],
      contextRefs: ["evidence-1"],
      supportFamilies: ["same-family"],
      counterFamilies: [],
      status: "graph_not_verdict",
    }];

    const result = preparePatternHopEvidenceIntegration({
      candidate: candidate(),
      scope,
      projectId: "project",
      claimSummaries: claims,
    });

    expect(result.evidenceRefs).toEqual(["evidence-0", "evidence-1"]);
    expect(result.ark.independentCorroborationVerified).toBe(false);
    expect(result.signal).toBe("retrieval");
  });

  it("routes evidence-bound failed-lead work as unresolved without auto-submitting it", () => {
    const reroutes: RerouteDirective[] = [{
      leadId: "lead-a",
      status: "reroute",
      queries: ["alternate source family"],
      reason: "failed_lead_evidence_bound_reroute",
    }];

    const result = preparePatternHopEvidenceIntegration({
      candidate: candidate(),
      scope,
      projectId: "project",
      reroutes,
    });

    expect(result.signal).toBe("unresolved_work");
    expect(result.roundabout[0].route).toMatchObject({
      decision: "continue",
      grantsExecution: false,
      learningApplied: false,
      consequenceVerifiedByThisCode: false,
    });
    expect(result.ark.submitted).toBe(false);
  });

  it("fails closed when a prepared candidate cannot fit the existing ARK submission contract", () => {
    expect(() => preparePatternHopEvidenceIntegration({
      candidate: candidate({ maxDepth: 4 }),
      scope,
      projectId: "project",
    })).toThrow("pattern_hop_candidate_exceeds_ark_bounds");

    expect(() => preparePatternHopEvidenceIntegration({
      candidate: preparePatternHopCandidate({
        candidateId: "candidate-long",
        anomalyRef: "anomaly-long",
        objective: "Synthetic objective.",
        requestedQuery: "x".repeat(2001),
        triggerEvidenceRefs: ["evidence-0"],
        maxDepth: 3,
        maxHopsPerAttempt: 6,
      }),
      scope,
      projectId: "project",
    })).toThrow("pattern_hop_candidate_exceeds_ark_seed_limit");
  });

  it("refuses a cross-project ARK projection", () => {
    expect(() => preparePatternHopEvidenceIntegration({
      candidate: candidate(),
      scope,
      projectId: "other-project",
    })).toThrow("pattern_hop_ark_project_scope_mismatch");
  });
});
