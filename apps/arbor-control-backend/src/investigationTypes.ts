export type EvidenceKind = "fact" | "allegation" | "inference";
export type EntityResolutionStatus =
  | "unresolved"
  | "ambiguous"
  | "probable"
  | "confirmed";

export type SourceIndependenceStatus =
  | "unknown"
  | "duplicate"
  | "shared_origin"
  | "derived"
  | "independent";

export type EvidenceLocator = {
  documentId: string;
  page?: number;
  lineStart?: number;
  lineEnd?: number;
  section?: string;
  nativeLocator?: string;
};

export type EvidenceDates = {
  documentDate?: string;
  eventDate?: string;
  publicationDate?: string;
  ingestionDate: string;
};

export type EvidenceProvenance = {
  sourceId: string;
  sourceFamilyId: string;
  originalSource: string;
  acquisitionMethod: string;
  acquiredAt: string;
  contentHash: string;
  fileFamilyHash?: string;
  originId?: string;
  duplicateOfSourceId?: string;
  derivedFromSourceIds?: string[];
};

export type EntityReference = {
  entityId?: string;
  observedName: string;
  aliases?: string[];
  status: EntityResolutionStatus;
  confidence: number;
  temporalCompatibility?: "compatible" | "incompatible" | "unknown";
  geographicCompatibility?: "compatible" | "incompatible" | "unknown";
  contradictoryEvidenceIds?: string[];
};

export type CounterEvidenceRef = {
  evidenceId: string;
  relation: "contradicts" | "qualifies" | "limits";
  note?: string;
};

export type HopRecord = {
  at: string;
  reason: string;
  triggeringEvidenceIds: string[];
  expectedConfirmation?: string;
  expectedDisconfirmation?: string;
};

export type ExtractionQuality = {
  method?: "native_text" | "ocr" | "manual_transcription" | "mixed";
  confidence?: number;
  warnings?: string[];
};

export type DocumentCompleteness = {
  status: "complete" | "partial" | "fragment" | "unknown";
  missingRanges?: string[];
  note?: string;
};

export type EvidencePacket = {
  schemaVersion: "1.0";
  evidenceId: string;
  documentId: string;
  locator: EvidenceLocator;
  provenance: EvidenceProvenance;
  dates: EvidenceDates;
  atomicClaim: string;
  kind: EvidenceKind;
  confidence: number;
  entities: EntityReference[];
  counterevidence: CounterEvidenceRef[];
  sourceIndependence: SourceIndependenceStatus;
  extractionQuality?: ExtractionQuality;
  documentCompleteness?: DocumentCompleteness;
  context?: string;
  causalContext?: string;
  validFrom?: string;
  validUntil?: string;
  hopHistory: HopRecord[];
  activeObjective: string;
};

export type SourceRecord = {
  sourceId: string;
  sourceFamilyId?: string;
  contentHash: string;
  fileFamilyHash?: string;
  originId?: string;
  duplicateOfSourceId?: string;
  derivedFromSourceIds?: string[];
};

export type EntityCandidate = {
  entityId: string;
  canonicalName: string;
  aliases: string[];
  temporalCompatibility: "compatible" | "incompatible" | "unknown";
  geographicCompatibility: "compatible" | "incompatible" | "unknown";
  contradictoryEvidenceIds: string[];
  confidence: number;
};

export type ClaimNode = {
  claimId: string;
  text: string;
  kind: EvidenceKind;
};

export type EvidenceGraphEdge = {
  from: string;
  to: string;
  relation:
    | "supports"
    | "contradicts"
    | "qualifies"
    | "derived_from"
    | "independent_of"
    | "same_source_family"
    | "temporal_context"
    | "causal_context";
};

export type EvidenceGraph = {
  claims: Record<string, ClaimNode>;
  evidence: Record<string, EvidencePacket>;
  edges: EvidenceGraphEdge[];
};

export type CoverageEntry = {
  scopeId: string;
  description: string;
  status: "not_searched" | "searched" | "partial" | "exhausted";
  searchedAt?: string;
  sourceFamiliesChecked: string[];
  expectedMaterial?: string[];
  notFound?: string[];
  deadEnds?: string[];
  unresolvedLeads?: string[];
  chronologyGaps?: string[];
  saturationNote?: string;
};

export type Hypothesis = {
  hypothesisId: string;
  statement: string;
  status: "open" | "weakened" | "strengthened" | "rejected";
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingEvidence: string[];
  alternativeExplanations: string[];
  predictions: string[];
  disconfirmingSearches: string[];
};

export type FindingSnapshot = {
  findingId: string;
  version: number;
  createdAt: string;
  status: "current" | "superseded" | "withdrawn";
  statement: string;
  evidenceIds: string[];
  counterevidenceIds: string[];
  entityState: EntityResolutionStatus;
  confidence: number;
  uncertainty: string[];
  supersedesVersion?: number;
};

export type HighStakesTransformation =
  | "association_to_conduct"
  | "allegation_to_fact"
  | "ambiguous_to_confirmed_identity"
  | "repetition_to_independent_corroboration";

export type ReviewGateResult = {
  allowed: boolean;
  reason: string;
};

export type InvestigationRoute = {
  next:
    | "resolve_identity"
    | "seek_independent_source"
    | "resolve_contradiction"
    | "fill_coverage_gap"
    | "test_hypothesis"
    | "snapshot_finding"
    | "complete";
  reason: string;
};
