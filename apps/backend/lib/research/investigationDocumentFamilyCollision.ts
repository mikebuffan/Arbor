export type InvestigationFamilyObservation = {
  eventKey: string;
  documentFamily: string;
  purposeKey: string;
  evidenceRef: string;
  lineageKey: string;
  entityIds: string[];
};

export type InvestigationFamilyCollision = {
  eventKey: string;
  documentFamilies: string[];
  purposeKeys: string[];
  independentLineages: string[];
  evidenceRefs: string[];
  entityIds: string[];
  status: "single_purpose_cluster" | "independent_family_collision";
  note:
    "Cross-purpose document convergence strengthens an event lead, but does not by itself establish conduct or causation.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("family_collision_invalid_" + field);
  }
  return value.trim();
}

function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("family_collision_invalid_" + field);
  }
  return [...new Set(value.map((item) => text(item, field, 1000)))];
}

export function detectDocumentFamilyCollisions(input: {
  observations: InvestigationFamilyObservation[];
  minPurposeKeys?: number;
  minLineages?: number;
}): InvestigationFamilyCollision[] {
  if (!Array.isArray(input.observations) ||
      input.observations.length < 1 ||
      input.observations.length > 20_000) {
    throw new Error("family_collision_invalid_observations");
  }
  const minPurposes = Math.max(2, Math.min(input.minPurposeKeys ?? 3, 10));
  const minLineages = Math.max(2, Math.min(input.minLineages ?? 3, 10));
  const byEvent = new Map<string, InvestigationFamilyObservation[]>();

  for (const raw of input.observations) {
    const observation = {
      eventKey: text(raw.eventKey, "event_key", 1000),
      documentFamily: text(raw.documentFamily, "document_family", 1000),
      purposeKey: text(raw.purposeKey, "purpose_key", 1000),
      evidenceRef: text(raw.evidenceRef, "evidence_ref", 1000),
      lineageKey: text(raw.lineageKey, "lineage_key", 1000),
      entityIds: strings(raw.entityIds, "entity_ids"),
    };
    byEvent.set(observation.eventKey, [
      ...(byEvent.get(observation.eventKey) ?? []),
      observation,
    ]);
  }

  return [...byEvent.entries()].map(([eventKey, observations]) => {
    const documentFamilies = [
      ...new Set(observations.map((o) => o.documentFamily)),
    ].sort();
    const purposeKeys = [
      ...new Set(observations.map((o) => o.purposeKey)),
    ].sort();
    const independentLineages = [
      ...new Set(observations.map((o) => o.lineageKey)),
    ].sort();
    return {
      eventKey,
      documentFamilies,
      purposeKeys,
      independentLineages,
      evidenceRefs: [
        ...new Set(observations.map((o) => o.evidenceRef)),
      ].sort(),
      entityIds: [
        ...new Set(observations.flatMap((o) => o.entityIds)),
      ].sort(),
      status:
        purposeKeys.length >= minPurposes &&
        independentLineages.length >= minLineages
          ? "independent_family_collision"
          : "single_purpose_cluster",
      note:
        "Cross-purpose document convergence strengthens an event lead, but does not by itself establish conduct or causation.",
    } satisfies InvestigationFamilyCollision;
  });
}
