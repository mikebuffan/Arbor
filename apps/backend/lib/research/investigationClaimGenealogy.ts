export type InvestigationClaimTransmission = {
  id: string;
  claimKey: string;
  sourceRef: string;
  sourceKind:
    | "primary_record"
    | "sworn_testimony"
    | "news"
    | "book"
    | "podcast"
    | "social"
    | "other";
  parentTransmissionIds: string[];
  provenanceStatus: "known" | "partial" | "unknown";
};

export type InvestigationClaimGenealogy = {
  claimKey: string;
  transmissions: number;
  rootTransmissionIds: string[];
  unresolvedParentRefs: string[];
  status:
    | "single_known_origin"
    | "multiple_known_origins"
    | "provenance_incomplete";
  apparentRepetitionCount: number;
  independentOriginCount: number | null;
  note:
    "Repeated transmission is not independent corroboration unless provenance establishes independent origins.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("claim_genealogy_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error("claim_genealogy_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 500));
  if (new Set(out).size !== out.length) {
    throw new Error("claim_genealogy_duplicate_" + field);
  }
  return out;
}

function validateTransmission(
  value: InvestigationClaimTransmission,
): InvestigationClaimTransmission {
  const sourceKinds = [
    "primary_record",
    "sworn_testimony",
    "news",
    "book",
    "podcast",
    "social",
    "other",
  ];
  if (!sourceKinds.includes(value.sourceKind)) {
    throw new Error("claim_genealogy_invalid_source_kind");
  }
  if (!["known", "partial", "unknown"].includes(value.provenanceStatus)) {
    throw new Error("claim_genealogy_invalid_provenance_status");
  }
  return {
    id: text(value.id, "transmission_id", 300),
    claimKey: text(value.claimKey, "claim_key", 1000),
    sourceRef: text(value.sourceRef, "source_ref", 1000),
    sourceKind: value.sourceKind,
    parentTransmissionIds: strings(
      value.parentTransmissionIds,
      "parent_transmission_ids",
      50,
    ),
    provenanceStatus: value.provenanceStatus,
  };
}

function detectCycle(
  byId: Map<string, InvestigationClaimTransmission>,
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visiting.has(id)) {
      throw new Error("claim_genealogy_cycle_detected");
    }
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) return;

    visiting.add(id);
    for (const parentId of node.parentTransmissionIds) {
      if (byId.has(parentId)) visit(parentId);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of byId.keys()) visit(id);
}

export function analyzeClaimGenealogy(input: {
  claimKey: string;
  transmissions: InvestigationClaimTransmission[];
}): InvestigationClaimGenealogy {
  const claimKey = text(input.claimKey, "claim_key", 1000);
  if (!Array.isArray(input.transmissions) ||
      input.transmissions.length < 1 ||
      input.transmissions.length > 10_000) {
    throw new Error("claim_genealogy_invalid_transmissions");
  }

  const transmissions = input.transmissions.map(validateTransmission);
  if (new Set(transmissions.map((item) => item.id)).size !== transmissions.length) {
    throw new Error("claim_genealogy_duplicate_transmission_id");
  }
  if (transmissions.some((item) => item.claimKey !== claimKey)) {
    throw new Error("claim_genealogy_claim_mismatch");
  }

  const byId = new Map(transmissions.map((item) => [item.id, item]));
  detectCycle(byId);

  const unresolvedParentRefs = [
    ...new Set(
      transmissions.flatMap((item) =>
        item.parentTransmissionIds.filter((parentId) => !byId.has(parentId))),
    ),
  ].sort();

  const provenanceIncomplete =
    unresolvedParentRefs.length > 0 ||
    transmissions.some((item) => item.provenanceStatus !== "known");

  const roots = transmissions
    .filter((item) => item.parentTransmissionIds.length === 0)
    .map((item) => item.id)
    .sort();

  let status: InvestigationClaimGenealogy["status"];
  let independentOriginCount: number | null;
  if (provenanceIncomplete) {
    status = "provenance_incomplete";
    independentOriginCount = null;
  } else if (roots.length <= 1) {
    status = "single_known_origin";
    independentOriginCount = roots.length;
  } else {
    status = "multiple_known_origins";
    independentOriginCount = roots.length;
  }

  return {
    claimKey,
    transmissions: transmissions.length,
    rootTransmissionIds: roots,
    unresolvedParentRefs,
    status,
    apparentRepetitionCount: transmissions.length,
    independentOriginCount,
    note:
      "Repeated transmission is not independent corroboration unless provenance establishes independent origins.",
  };
}
