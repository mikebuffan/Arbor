import type {
  CoverageEntry,
  EntityCandidate,
  EntityReference,
  EvidenceGraph,
  EvidenceGraphEdge,
  EvidencePacket,
  FindingSnapshot,
  HighStakesTransformation,
  Hypothesis,
  InvestigationRoute,
  ReviewGateResult,
  SourceIndependenceStatus,
  SourceRecord,
} from "./investigationTypes.js";

function stableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`invalid_${field}`);
}

function assertConfidence(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`invalid_${field}`);
  }
}

export type EvidenceReviewFlag =
  | "low_extraction_confidence"
  | "extraction_warning"
  | "partial_document"
  | "unresolved_identity"
  | "non_independent_source"
  | "counterevidence_present";

export function evidenceReviewFlags(
  packet: EvidencePacket,
): EvidenceReviewFlag[] {
  const flags: EvidenceReviewFlag[] = [];

  if (
    packet.extractionQuality?.confidence !== undefined &&
    packet.extractionQuality.confidence < 0.9
  ) {
    flags.push("low_extraction_confidence");
  }

  if ((packet.extractionQuality?.warnings?.length ?? 0) > 0) {
    flags.push("extraction_warning");
  }

  if (
    packet.documentCompleteness &&
    packet.documentCompleteness.status !== "complete"
  ) {
    flags.push("partial_document");
  }

  if (
    packet.entities.some(
      (entity) =>
        entity.status === "unresolved" ||
        entity.status === "ambiguous",
    )
  ) {
    flags.push("unresolved_identity");
  }

  if (packet.sourceIndependence !== "independent") {
    flags.push("non_independent_source");
  }

  if (packet.counterevidence.length > 0) {
    flags.push("counterevidence_present");
  }

  return [...new Set(flags)];
}

export function validateEvidencePacket(packet: EvidencePacket): EvidencePacket {
  if (packet.schemaVersion !== "1.0") {
    throw new Error("unsupported_evidence_packet_version");
  }

  for (const [field, value] of [
    ["evidenceId", packet.evidenceId],
    ["documentId", packet.documentId],
    ["atomicClaim", packet.atomicClaim],
    ["activeObjective", packet.activeObjective],
    ["sourceId", packet.provenance.sourceId],
    ["sourceFamilyId", packet.provenance.sourceFamilyId],
    ["originalSource", packet.provenance.originalSource],
    ["contentHash", packet.provenance.contentHash],
    ["locator.documentId", packet.locator.documentId],
  ] as const) {
    assertNonEmpty(value, field);
  }

  if (packet.locator.documentId !== packet.documentId) {
    throw new Error("evidence_locator_document_mismatch");
  }

  assertConfidence(packet.confidence, "confidence");

  if (packet.extractionQuality?.confidence !== undefined) {
    assertConfidence(
      packet.extractionQuality.confidence,
      "extraction_confidence",
    );
  }

  for (const entity of packet.entities) {
    assertConfidence(entity.confidence, "entity_confidence");
  }

  if (!packet.dates.ingestionDate) {
    throw new Error("missing_ingestion_date");
  }

  return stableClone(packet);
}

export function roundTripEvidencePacket(
  packet: EvidencePacket,
): EvidencePacket {
  const outbound = validateEvidencePacket(packet);
  const serialized = JSON.stringify(outbound);
  return validateEvidencePacket(
    JSON.parse(serialized) as EvidencePacket,
  );
}

export type SourceFamilyResult = {
  familyId: string;
  status: SourceIndependenceStatus;
  members: string[];
  independentWeight: number;
  reason: string;
};

export function classifySourceFamilies(
  sources: SourceRecord[],
): SourceFamilyResult[] {
  const familyByKey = new Map<string, SourceRecord[]>();

  for (const source of sources) {
    const key =
      source.sourceFamilyId ??
      source.originId ??
      source.fileFamilyHash ??
      source.contentHash;

    const members = familyByKey.get(key) ?? [];
    members.push(source);
    familyByKey.set(key, members);
  }

  return [...familyByKey.entries()].map(([familyId, members]) => {
    const hashes = new Set(members.map((item) => item.contentHash));
    const originIds = new Set(
      members.map((item) => item.originId).filter(Boolean),
    );
    const hasExplicitDuplicate = members.some(
      (item) => Boolean(item.duplicateOfSourceId),
    );
    const hasDerived = members.some(
      (item) => (item.derivedFromSourceIds?.length ?? 0) > 0,
    );

    let status: SourceIndependenceStatus = "independent";
    let reason = "distinct source family/origin";

    if (hashes.size === 1 && members.length > 1) {
      status = "duplicate";
      reason = "identical content hash";
    } else if (hasExplicitDuplicate) {
      status = "duplicate";
      reason = "explicit duplicate linkage";
    } else if (originIds.size === 1 && members.length > 1) {
      status = "shared_origin";
      reason = "shared origin";
    } else if (hasDerived) {
      status = "derived";
      reason = "derived/copy chain";
    }

    return {
      familyId,
      status,
      members: members.map((item) => item.sourceId),
      independentWeight: status === "independent" ? 1 : 0,
      reason,
    };
  });
}

export function independentSourceCount(
  sources: SourceRecord[],
): number {
  return classifySourceFamilies(sources).reduce(
    (total, family) => total + family.independentWeight,
    0,
  );
}

function normalizedNames(candidate: EntityCandidate): Set<string> {
  return new Set(
    [candidate.canonicalName, ...candidate.aliases].map((value) =>
      value.trim().toLowerCase()
    ),
  );
}

export function resolveEntity(
  observedName: string,
  candidates: EntityCandidate[],
): EntityReference {
  const target = observedName.trim().toLowerCase();
  const nameMatches = candidates.filter((candidate) =>
    normalizedNames(candidate).has(target)
  );

  const compatible = nameMatches.filter((candidate) =>
    candidate.temporalCompatibility !== "incompatible" &&
    candidate.geographicCompatibility !== "incompatible" &&
    candidate.contradictoryEvidenceIds.length === 0
  );

  if (compatible.length !== 1) {
    return {
      observedName,
      status: compatible.length > 1 ? "ambiguous" : "unresolved",
      confidence: 0,
      contradictoryEvidenceIds: [
        ...new Set(
          nameMatches.flatMap((candidate) =>
            candidate.contradictoryEvidenceIds
          ),
        ),
      ],
    };
  }

  const match = compatible[0];

  if (match.confidence < 0.95) {
    return {
      entityId: match.entityId,
      observedName,
      aliases: match.aliases,
      status: "probable",
      confidence: match.confidence,
      temporalCompatibility: match.temporalCompatibility,
      geographicCompatibility: match.geographicCompatibility,
      contradictoryEvidenceIds: match.contradictoryEvidenceIds,
    };
  }

  return {
    entityId: match.entityId,
    observedName,
    aliases: match.aliases,
    status: "confirmed",
    confidence: match.confidence,
    temporalCompatibility: match.temporalCompatibility,
    geographicCompatibility: match.geographicCompatibility,
    contradictoryEvidenceIds: [],
  };
}

export function emptyEvidenceGraph(): EvidenceGraph {
  return {
    claims: {},
    evidence: {},
    edges: [],
  };
}

export function addEvidencePacket(
  graph: EvidenceGraph,
  claimId: string,
  packet: EvidencePacket,
  relation: "supports" | "contradicts" | "qualifies" = "supports",
): EvidenceGraph {
  const validated = validateEvidencePacket(packet);

  if (!graph.claims[claimId]) {
    throw new Error("unknown_claim");
  }

  return {
    claims: { ...graph.claims },
    evidence: {
      ...graph.evidence,
      [validated.evidenceId]: validated,
    },
    edges: [
      ...graph.edges,
      {
        from: validated.evidenceId,
        to: claimId,
        relation,
      },
    ],
  };
}

export function addGraphEdge(
  graph: EvidenceGraph,
  edge: EvidenceGraphEdge,
): EvidenceGraph {
  return {
    claims: { ...graph.claims },
    evidence: { ...graph.evidence },
    edges: [...graph.edges, stableClone(edge)],
  };
}

export function traceClaimEvidence(
  graph: EvidenceGraph,
  claimId: string,
): EvidencePacket[] {
  if (!graph.claims[claimId]) throw new Error("unknown_claim");

  const evidenceIds = graph.edges
    .filter(
      (edge) =>
        edge.to === claimId &&
        ["supports", "contradicts", "qualifies"].includes(edge.relation),
    )
    .map((edge) => edge.from);

  return evidenceIds
    .map((id) => graph.evidence[id])
    .filter((value): value is EvidencePacket => Boolean(value))
    .map(stableClone);
}

export function recordCoverage(
  entries: CoverageEntry[],
  next: CoverageEntry,
): CoverageEntry[] {
  const filtered = entries.filter(
    (entry) => entry.scopeId !== next.scopeId,
  );
  return [...filtered, stableClone(next)];
}

export function negativeEvidenceConclusion(
  entry: CoverageEntry,
): "not_searched" | "not_found_in_searched_scope" | "search_exhausted_no_hit" {
  if (entry.status === "not_searched") return "not_searched";
  if (entry.status === "exhausted") return "search_exhausted_no_hit";
  return "not_found_in_searched_scope";
}

export function updateHypothesis(
  hypothesis: Hypothesis,
  input: {
    supportingEvidenceIds?: string[];
    contradictingEvidenceIds?: string[];
    missingEvidence?: string[];
    alternativeExplanations?: string[];
    predictions?: string[];
    disconfirmingSearches?: string[];
  },
): Hypothesis {
  const merge = (a: string[], b: string[] | undefined) =>
    [...new Set([...a, ...(b ?? [])])];

  const supportingEvidenceIds = merge(
    hypothesis.supportingEvidenceIds,
    input.supportingEvidenceIds,
  );
  const contradictingEvidenceIds = merge(
    hypothesis.contradictingEvidenceIds,
    input.contradictingEvidenceIds,
  );

  let status = hypothesis.status;

  if (
    contradictingEvidenceIds.length > supportingEvidenceIds.length &&
    contradictingEvidenceIds.length > 0
  ) {
    status = "weakened";
  } else if (
    supportingEvidenceIds.length > contradictingEvidenceIds.length &&
    supportingEvidenceIds.length > 0
  ) {
    status = "strengthened";
  }

  return {
    ...hypothesis,
    status,
    supportingEvidenceIds,
    contradictingEvidenceIds,
    missingEvidence: merge(hypothesis.missingEvidence, input.missingEvidence),
    alternativeExplanations: merge(
      hypothesis.alternativeExplanations,
      input.alternativeExplanations,
    ),
    predictions: merge(hypothesis.predictions, input.predictions),
    disconfirmingSearches: merge(
      hypothesis.disconfirmingSearches,
      input.disconfirmingSearches,
    ),
  };
}

export function createFindingSnapshot(input: Omit<
  FindingSnapshot,
  "version" | "status" | "createdAt"
>): FindingSnapshot {
  return {
    ...stableClone(input),
    version: 1,
    status: "current",
    createdAt: new Date().toISOString(),
  };
}

export function supersedeFinding(
  history: FindingSnapshot[],
  current: FindingSnapshot,
  replacement: Omit<
    FindingSnapshot,
    "version" | "status" | "createdAt" | "supersedesVersion"
  >,
): FindingSnapshot[] {
  if (current.status !== "current") {
    throw new Error("finding_not_current");
  }

  const superseded: FindingSnapshot = {
    ...stableClone(current),
    status: "superseded",
  };

  const next: FindingSnapshot = {
    ...stableClone(replacement),
    version: current.version + 1,
    status: "current",
    createdAt: new Date().toISOString(),
    supersedesVersion: current.version,
  };

  return [
    ...history.filter(
      (item) =>
        !(
          item.findingId === current.findingId &&
          item.version === current.version
        ),
    ),
    superseded,
    next,
  ];
}

export function reviewHighStakesTransformation(
  transformation: HighStakesTransformation,
  evidence: {
    entityStatus?: EntityReference["status"];
    sourceIndependence?: SourceIndependenceStatus;
    kind?: EvidencePacket["kind"];
    directConductEvidence?: boolean;
  },
): ReviewGateResult {
  switch (transformation) {
    case "association_to_conduct":
      return evidence.directConductEvidence
        ? { allowed: true, reason: "direct conduct evidence supplied" }
        : {
            allowed: false,
            reason: "association alone cannot establish conduct",
          };
    case "allegation_to_fact":
      return evidence.kind === "fact"
        ? { allowed: true, reason: "evidence classified as fact" }
        : {
            allowed: false,
            reason: "allegation/inference cannot be promoted to fact",
          };
    case "ambiguous_to_confirmed_identity":
      return evidence.entityStatus === "confirmed"
        ? { allowed: true, reason: "identity independently resolved" }
        : {
            allowed: false,
            reason: "identity remains unresolved or ambiguous",
          };
    case "repetition_to_independent_corroboration":
      return evidence.sourceIndependence === "independent"
        ? { allowed: true, reason: "source family is independent" }
        : {
            allowed: false,
            reason: "repetition/shared origin is not independent corroboration",
          };
  }
}

export function chooseInvestigationRoute(input: {
  packets: EvidencePacket[];
  coverage: CoverageEntry[];
  hypotheses: Hypothesis[];
}): InvestigationRoute {
  if (
    input.packets.some((packet) =>
      packet.entities.some(
        (entity) =>
          entity.status === "unresolved" ||
          entity.status === "ambiguous",
      )
    )
  ) {
    return {
      next: "resolve_identity",
      reason: "material evidence contains unresolved identity",
    };
  }

  if (
    input.packets.some(
      (packet) => packet.sourceIndependence !== "independent",
    )
  ) {
    return {
      next: "seek_independent_source",
      reason: "material evidence lacks independent corroboration",
    };
  }

  if (
    input.packets.some((packet) => packet.counterevidence.length > 0)
  ) {
    return {
      next: "resolve_contradiction",
      reason: "counterevidence remains unresolved",
    };
  }

  if (
    input.coverage.some(
      (entry) =>
        entry.status === "not_searched" ||
        entry.status === "partial" ||
        (entry.unresolvedLeads?.length ?? 0) > 0,
    )
  ) {
    return {
      next: "fill_coverage_gap",
      reason: "coverage remains incomplete",
    };
  }

  if (
    input.hypotheses.some(
      (hypothesis) =>
        hypothesis.status === "open" ||
        hypothesis.missingEvidence.length > 0,
    )
  ) {
    return {
      next: "test_hypothesis",
      reason: "open hypothesis still has discriminating tests",
    };
  }

  if (input.packets.length > 0) {
    return {
      next: "snapshot_finding",
      reason: "evidence path is resolved enough for a versioned finding",
    };
  }

  return {
    next: "complete",
    reason: "no active evidence work remains",
  };
}

export function exportFindingPacket(input: {
  finding: FindingSnapshot;
  graph: EvidenceGraph;
}): string {
  const evidence = input.finding.evidenceIds.map((evidenceId) => {
    const packet = input.graph.evidence[evidenceId];
    if (!packet) throw new Error(`missing_evidence:${evidenceId}`);
    return validateEvidencePacket(packet);
  });

  return JSON.stringify(
    {
      schemaVersion: "1.0",
      finding: stableClone(input.finding),
      evidence,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}
