import {
  routeFireflyPacket,
  type FireflyRoundaboutResult,
  type FireflyScope,
  type RoundaboutSignal,
} from "@/lib/arbor/runtime/knowledgeRouting";
import {
  ARK_PATTERN_HOP_SUBMISSION_LIMITS,
  ArkPatternHopRequest,
  type ArkPatternHopSubmissionRequest,
} from "@/lib/mcp/patternHopSubmissionContract";
import type { ClaimEvidenceSummary } from "./claimEvidenceGraph";
import type { PropagatedClaimConfidence } from "./contradictionPropagation";
import type { RerouteDirective } from "./failedLeadRouting";
import type { ResearchPatternHopCandidate } from "./researchPatternHopBridge";

const ROUNDABOUT_MAX_PROVENANCE = 12;

const uniq = (values: readonly string[]): string[] =>
  [...new Set(values.map(value => value.trim()).filter(Boolean))].sort();

function collectEvidenceRefs(input: {
  candidate: ResearchPatternHopCandidate;
  claimSummaries?: readonly ClaimEvidenceSummary[];
  contradictionEffects?: readonly PropagatedClaimConfidence[];
}): string[] {
  return uniq([
    ...input.candidate.seed.triggerEvidenceRefs,
    ...(input.claimSummaries ?? []).flatMap(summary => [
      ...summary.supportRefs,
      ...summary.counterRefs,
      ...summary.contextRefs,
    ]),
    ...(input.contradictionEffects ?? []).flatMap(effect => effect.evidenceRefs),
  ]);
}

function researchSignal(input: {
  claimSummaries?: readonly ClaimEvidenceSummary[];
  contradictionEffects?: readonly PropagatedClaimConfidence[];
  reroutes?: readonly RerouteDirective[];
}): RoundaboutSignal {
  if (
    (input.claimSummaries ?? []).some(summary => summary.counterRefs.length > 0) ||
    (input.contradictionEffects ?? []).some(effect =>
      effect.directContradictionSeverity > 0 || effect.propagatedFrom.length > 0)
  ) {
    return "contradiction";
  }
  if ((input.reroutes ?? []).some(route => route.status === "reroute")) {
    return "unresolved_work";
  }
  return "retrieval";
}

function contradictionLabels(input: {
  claimSummaries?: readonly ClaimEvidenceSummary[];
  contradictionEffects?: readonly PropagatedClaimConfidence[];
}): string[] {
  return uniq([
    ...(input.claimSummaries ?? [])
      .filter(summary => summary.counterRefs.length > 0)
      .map(summary => "claim:" + summary.claimId),
    ...(input.contradictionEffects ?? [])
      .filter(effect =>
        effect.directContradictionSeverity > 0 || effect.propagatedFrom.length > 0)
      .map(effect => "claim:" + effect.claimId),
  ]);
}

export type PreparedArkPatternHopHandoff = {
  request: ArkPatternHopSubmissionRequest;
  triggerEvidenceRefs: readonly string[];
  executionRequested: false;
  submitted: false;
  status: "prepared_not_submitted";
  independentCorroborationVerified: false;
  grantsExecution: false;
};

export type PatternHopRoundaboutBatch = {
  evidenceRefs: readonly string[];
  route: FireflyRoundaboutResult;
};

export type PatternHopEvidenceIntegration = {
  candidateId: string;
  evidenceRefs: readonly string[];
  signal: RoundaboutSignal;
  roundabout: readonly PatternHopRoundaboutBatch[];
  ark: PreparedArkPatternHopHandoff;
};

/**
 * Source-only composition seam:
 * Pattern Hop candidate -> Evidence Engine review state -> existing Roundabout
 * -> the exact existing ARK Pattern Hop submission contract.
 *
 * It never submits a task, grants execution, resolves identity, or converts
 * association/counterevidence into a conduct verdict. Every evidence ref is
 * retained in the returned union and in one Roundabout batch even when the
 * existing router's 12-provenance-item packet bound requires chunking.
 */
export function preparePatternHopEvidenceIntegration(input: {
  candidate: ResearchPatternHopCandidate;
  scope: FireflyScope;
  projectId: string;
  requestId: string;
  claimSummaries?: readonly ClaimEvidenceSummary[];
  contradictionEffects?: readonly PropagatedClaimConfidence[];
  reroutes?: readonly RerouteDirective[];
}): PatternHopEvidenceIntegration {
  const candidate = input.candidate;
  if (candidate.executionRequested !== false ||
      candidate.status !== "prepared_not_submitted") {
    throw new Error("pattern_hop_evidence_bridge_requires_prepared_candidate");
  }
  if (candidate.maxDepth > ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxDepth ||
      candidate.maxHopsPerAttempt > ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxHops) {
    throw new Error("pattern_hop_candidate_exceeds_ark_bounds");
  }
  if (candidate.seed.requestedQuery.length >
      ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxSeedChars) {
    throw new Error("pattern_hop_candidate_exceeds_ark_seed_limit");
  }
  if (!input.projectId.trim() || input.projectId !== input.scope.projectId) {
    throw new Error("pattern_hop_ark_project_scope_mismatch");
  }

  const requestResult = ArkPatternHopRequest.safeParse({
    projectId: input.projectId,
    requestId: input.requestId,
    seed: candidate.seed.requestedQuery,
    runId: null,
    maxHops: candidate.maxHopsPerAttempt,
    maxDepth: candidate.maxDepth,
  });
  if (!requestResult.success) {
    throw new Error("pattern_hop_ark_request_invalid");
  }

  const evidenceRefs = collectEvidenceRefs(input);
  if (!evidenceRefs.length) {
    throw new Error("pattern_hop_evidence_bridge_requires_provenance");
  }

  const signal = researchSignal(input);
  const conflicts = contradictionLabels(input);
  const chunks: string[][] = [];
  for (let i = 0; i < evidenceRefs.length; i += ROUNDABOUT_MAX_PROVENANCE) {
    chunks.push(evidenceRefs.slice(i, i + ROUNDABOUT_MAX_PROVENANCE));
  }

  const roundabout = chunks.map((refs, index) => ({
    evidenceRefs: refs,
    route: routeFireflyPacket({
      scope: input.scope,
      domain: "artifact",
      stage: "observe",
      rhythm: "stability",
      signal,
      packet: {
        packetType: "pattern_hop_evidence_review",
        meaning:
          "Review evidence-bound Pattern Hop candidate " +
          candidate.candidateId +
          " before any execution or finding promotion.",
        relevance: 1,
        provenance: refs.map(sourceRef => ({
          sourceKind: "research_evidence",
          sourceRef,
        })),
        conflicts,
        payload: {
          candidateId: candidate.candidateId,
          chunkIndex: index,
          chunkCount: chunks.length,
          executionRequested: false,
        },
      },
    }),
  }));

  return {
    candidateId: candidate.candidateId,
    evidenceRefs,
    signal,
    roundabout,
    ark: {
      request: requestResult.data,
      triggerEvidenceRefs: [...candidate.seed.triggerEvidenceRefs],
      executionRequested: false,
      submitted: false,
      status: "prepared_not_submitted",
      independentCorroborationVerified: false,
      grantsExecution: false,
    },
  };
}
