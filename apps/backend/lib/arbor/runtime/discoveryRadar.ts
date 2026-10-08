/**
 * Bounded Discovery Radar prototype over already authorized, metadata-only
 * evidence. This delegates ranking to the existing Pattern Hop scorer.
 * No crawling, identity resolution, ingestion, memory write, task submission,
 * or cross-project authorization happens here.
 */
import {
  selectNextHopCandidates,
  type PatternHopCandidate,
  type PatternHopRelationship,
} from "../../memory/patternHopEngine";
import type { PatternHopEvidence } from "../../memory/patternHop";
import { roadsForVaultDomain } from "./knowledgeRouting";

export type DiscoveryScope = { userId: string; projectId: string };
export type DiscoveryMetadata = DiscoveryScope & {
  sourceFamilyId: string;
  /** Restricted to caller-reviewed, non-sensitive metadata. */
  evidence: PatternHopEvidence;
  retrievalScore: number;
  retrievalMethod: string;
};
export type DiscoverySuggestion = {
  evidenceId: string;
  projectId: string;
  sourceFamilyId: string;
  sourceRef: string;
  relationship: PatternHopRelationship;
  rationale: string;
  relevanceScore: number;
  epistemicStatus: PatternHopEvidence["epistemicStatus"];
  /** Not proof that any source family independently verified a claim. */
  corroborationVerified: false;
  suggestedRoads: ReturnType<typeof roadsForVaultDomain>;
};
export type DiscoveryRadarResult = {
  scope: DiscoveryScope;
  suggestions: DiscoverySuggestion[];
  repeatedFamilyCount: number;
  hasCrossProjectSuggestions: boolean;
  discoveryMethod: "existing-pattern-hop-heuristic";
  permissionVerifiedHere: false;
  discoveryVerifiedHere: false;
  grantsExecution: false;
  createsTasks: false;
};

function good(value: unknown, max: number): value is string {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= max;
}
function requireScope(scope: DiscoveryScope): void {
  if (!scope || !good(scope.userId, 200) || !good(scope.projectId, 200))
    throw new Error("discovery_radar_scope_required");
}
function validateMetadata(item: DiscoveryMetadata, userId: string): void {
  if (!item || item.userId !== userId || !good(item.projectId, 200) ||
      !good(item.sourceFamilyId, 200) ||
      !good(item.retrievalMethod, 100) ||
      !Number.isFinite(item.retrievalScore) || item.retrievalScore < 0 || item.retrievalScore > 1 ||
      !item.evidence || !good(item.evidence.id, 200) ||
      !good(item.evidence.source, 300) ||
      !good(item.evidence.content, 500) ||
      !good(item.evidence.evidenceType, 100) ||
      !Number.isFinite(item.evidence.confidence) ||
      item.evidence.confidence < 0 || item.evidence.confidence > 1 ||
      !["direct", "derived", "hypothesis", "retrospective", "contradictory"]
        .includes(item.evidence.epistemicStatus))
    throw new Error("discovery_radar_invalid_metadata");
}

/**
 * The TRUSTED host must enforce that authorizedProjectIds came from authenticated
 * grants and that all input metadata is disclosure-safe before calling us.
 * This function performs defense-in-depth scope checks, not authentication.
 */
export function projectDiscoveryRadar(input: {
  scope: DiscoveryScope;
  seed: DiscoveryMetadata;
  candidates: readonly DiscoveryMetadata[];
  authorizedProjectIds: readonly string[];
  crossProjectEnabled?: boolean;
  maxSuggestions?: number;
  visitedEvidenceIds?: readonly string[];
}): DiscoveryRadarResult {
  requireScope(input.scope);
  if (!Array.isArray(input.candidates) || input.candidates.length > 32 ||
      !Array.isArray(input.authorizedProjectIds) || input.authorizedProjectIds.length > 20 ||
      !Array.isArray(input.visitedEvidenceIds ?? []))
    throw new Error("discovery_radar_invalid_input");

  // Visited IDs are host-supplied input, not independent provenance. Bound
  // them before handing the set to the existing Pattern Hop engine.
  const visitedIds = input.visitedEvidenceIds ?? [];
  if (visitedIds.length > 128 ||
      visitedIds.some(id => !good(id, 200)) ||
      new Set(visitedIds).size !== visitedIds.length)
    throw new Error("discovery_radar_invalid_visited_ids");

  const maxSuggestions = input.maxSuggestions ?? 5;
  if (!Number.isSafeInteger(maxSuggestions) || maxSuggestions < 1 || maxSuggestions > 8)
    throw new Error("discovery_radar_invalid_limit");

  const allowed = new Set(input.authorizedProjectIds);
  if (!allowed.has(input.scope.projectId) ||
      input.seed.userId !== input.scope.userId ||
      input.seed.projectId !== input.scope.projectId)
    throw new Error("discovery_radar_access_denied");

  validateMetadata(input.seed, input.scope.userId);
  const ids = new Set([input.seed.evidence.id]);
  const grouped = new Map<string, DiscoveryMetadata>();
  let repeatedFamilyCount = 0;
  for (const item of input.candidates) {
    validateMetadata(item, input.scope.userId);
    if (!allowed.has(item.projectId) ||
        (item.projectId !== input.scope.projectId && !input.crossProjectEnabled))
      throw new Error("discovery_radar_access_denied");
    if (ids.has(item.evidence.id)) throw new Error("discovery_radar_duplicate_evidence");
    ids.add(item.evidence.id);
    const familyKey = item.projectId + "\u0000" + item.sourceFamilyId;
    const existing = grouped.get(familyKey);
    if (existing) repeatedFamilyCount += 1;
    if (!existing || item.retrievalScore > existing.retrievalScore)
      grouped.set(familyKey, item);
  }
  const visited = new Set(visitedIds);
  visited.add(input.seed.evidence.id);
  const chosen = [...grouped.values()];
  const byId = new Map(chosen.map(item => [item.evidence.id, item]));
  const ranked = selectNextHopCandidates({
    parent: input.seed.evidence,
    candidates: chosen.map(item => ({
      evidence: item.evidence,
      retrievalScore: item.retrievalScore,
      retrievalMethod: item.retrievalMethod,
    } satisfies PatternHopCandidate)),
    visitedEvidenceIds: visited,
    minScore: 0.42,
    branchLimit: maxSuggestions,
  });
  const suggestions = ranked.flatMap(hit => {
    const item = byId.get(hit.evidence.id);
    return item ? [{
      evidenceId: hit.evidence.id,
      projectId: item.projectId,
      sourceFamilyId: item.sourceFamilyId,
      sourceRef: hit.evidence.source,
      relationship: hit.relationship,
      rationale: hit.relationshipReason,
      relevanceScore: hit.score,
      epistemicStatus: hit.evidence.epistemicStatus,
      corroborationVerified: false as const,
      suggestedRoads: roadsForVaultDomain("open_question"),
    }] : [];
  });
  return {
    scope: { ...input.scope },
    suggestions,
    repeatedFamilyCount,
    hasCrossProjectSuggestions: suggestions.some(item => item.projectId !== input.scope.projectId),
    discoveryMethod: "existing-pattern-hop-heuristic",
    permissionVerifiedHere: false,
    discoveryVerifiedHere: false,
    grantsExecution: false,
    createsTasks: false,
  };
}
