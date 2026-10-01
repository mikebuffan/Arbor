export type InvestigationEntityKind =
  | "person"
  | "organization"
  | "company"
  | "address"
  | "property"
  | "aircraft"
  | "phone"
  | "email"
  | "account"
  | "attorney"
  | "official"
  | "document_author"
  | "other";

export type InvestigationEntityRef = {
  id: string;
  label: string;
  kind: InvestigationEntityKind;
};

export type InvestigationObservation = {
  evidenceRef: string;
  lineageKey: string;
  documentFamily: string;
  occurredAt?: string | null;
  entities: InvestigationEntityRef[];
  eventTags: string[];
};

export type InvestigationExpectedFootprint = {
  hypothesisKey: string;
  description: string;
  expectedDocumentFamilies: string[];
  expectedEventTags?: string[];
  relatedEntityIds?: string[];
};

export type InvestigationDiscoveryLeadKind =
  | "bridge_node"
  | "cross_family_recurrence"
  | "temporal_convergence"
  | "expected_footprint_gap"
  | "reverse_path_check";

export type InvestigationDiscoveryLead = {
  id: string;
  kind: InvestigationDiscoveryLeadKind;
  hypothesis: string;
  rationale: string;
  basisEvidenceRefs: string[];
  entityIds: string[];
  independentLineages: string[];
  documentFamilies: string[];
  occurredAtRange: {
    first: string | null;
    last: string | null;
  };
  predictedFootprints: string[];
  falsifiers: string[];
  searchSeeds: string[];
  status: "hypothesis";
  confidenceCeiling: 0.49;
};

export type InvestigationDiscoveryResult = {
  leads: InvestigationDiscoveryLead[];
  observedEntityCount: number;
  observedLineageCount: number;
  observedDocumentFamilyCount: number;
  rules: {
    associationIsNotConduct: true;
    leadIsNotFinding: true;
    repeatedReportingIsNotIndependentCorroboration: true;
  };
};

type EntityOccurrence = {
  entity: InvestigationEntityRef;
  observations: InvestigationObservation[];
};

function clean(value: string, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_discovery_invalid_" + field);
  }
  return value.trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function timeRange(observations: InvestigationObservation[]) {
  const times = observations
    .map((item) => item.occurredAt ?? null)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    first: times.length ? new Date(times[0]).toISOString() : null,
    last: times.length ? new Date(times[times.length - 1]).toISOString() : null,
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "lead";
}

function validateObservation(
  observation: InvestigationObservation,
): InvestigationObservation {
  const evidenceRef = clean(observation.evidenceRef, "evidence_ref", 300);
  const lineageKey = clean(observation.lineageKey, "lineage_key", 300);
  const documentFamily = clean(
    observation.documentFamily,
    "document_family",
    300,
  );
  if (!Array.isArray(observation.entities) ||
      observation.entities.length > 100 ||
      !Array.isArray(observation.eventTags) ||
      observation.eventTags.length > 100) {
    throw new Error("investigation_discovery_invalid_observation_shape");
  }
  return {
    ...observation,
    evidenceRef,
    lineageKey,
    documentFamily,
    occurredAt: observation.occurredAt ?? null,
    entities: observation.entities.map((entity) => ({
      id: clean(entity.id, "entity_id", 300),
      label: clean(entity.label, "entity_label", 500),
      kind: entity.kind,
    })),
    eventTags: unique(
      observation.eventTags.map((tag) => clean(tag, "event_tag", 200)),
    ),
  };
}

function entityOccurrences(
  observations: InvestigationObservation[],
): EntityOccurrence[] {
  const byId = new Map<string, EntityOccurrence>();
  for (const observation of observations) {
    for (const entity of observation.entities) {
      const existing = byId.get(entity.id);
      if (!existing) {
        byId.set(entity.id, { entity, observations: [observation] });
      } else if (
        !existing.observations.some(
          (item) => item.evidenceRef === observation.evidenceRef,
        )
      ) {
        existing.observations.push(observation);
      }
    }
  }
  return [...byId.values()];
}

function eventWindowDays(observations: InvestigationObservation[]): number | null {
  const times = observations
    .map((item) => item.occurredAt)
    .filter((value): value is string => Boolean(value))
    .map(Date.parse)
    .filter(Number.isFinite);
  if (times.length < 2) return null;
  return (Math.max(...times) - Math.min(...times)) / 86_400_000;
}

function observationRefs(observations: InvestigationObservation[]): string[] {
  return unique(observations.map((item) => item.evidenceRef)).sort();
}

function occurrenceLineages(observations: InvestigationObservation[]): string[] {
  return unique(observations.map((item) => item.lineageKey)).sort();
}

function occurrenceFamilies(observations: InvestigationObservation[]): string[] {
  return unique(observations.map((item) => item.documentFamily)).sort();
}

function basisLead(
  input: Omit<
    InvestigationDiscoveryLead,
    "status" | "confidenceCeiling"
  >,
): InvestigationDiscoveryLead {
  return {
    ...input,
    status: "hypothesis",
    confidenceCeiling: 0.49,
  };
}

function bridgeLead(occurrence: EntityOccurrence): InvestigationDiscoveryLead | null {
  const lineages = occurrenceLineages(occurrence.observations);
  const families = occurrenceFamilies(occurrence.observations);
  if (lineages.length < 2 || families.length < 3) return null;

  const e = occurrence.entity;
  const tags = unique(
    occurrence.observations.flatMap((item) => item.eventTags),
  ).sort();

  return basisLead({
    id: "bridge-" + slug(e.id),
    kind: "bridge_node",
    hypothesis:
      e.label +
      " may be a bridge node connecting otherwise separate record clusters; " +
      "the connection may be operational, administrative, incidental, or coincidental.",
    rationale:
      "The same entity appears across " +
      String(families.length) +
      " document families and " +
      String(lineages.length) +
      " independent source lineages. Recurrence is a lead, not evidence of conduct.",
    basisEvidenceRefs: observationRefs(occurrence.observations),
    entityIds: [e.id],
    independentLineages: lineages,
    documentFamilies: families,
    occurredAtRange: timeRange(occurrence.observations),
    predictedFootprints: [
      "Independent records beginning from each connected cluster should reproduce some of the same entity relationships if the bridge is real.",
      "Operational involvement would normally leave role-specific records beyond mere name recurrence.",
    ],
    falsifiers: [
      "The recurrence resolves to unrelated same-name identities.",
      "The entity appears only because all records derive from one underlying source lineage.",
      "Reverse reconstruction from the connected clusters does not reproduce the relationship.",
    ],
    searchSeeds: unique([
      e.label + " " + families.join(" "),
      e.label + " role employer address property transaction",
      e.label + " independent record " + tags.join(" "),
    ]).slice(0, 4),
  });
}

function recurrenceLead(
  occurrence: EntityOccurrence,
): InvestigationDiscoveryLead | null {
  const lineages = occurrenceLineages(occurrence.observations);
  const families = occurrenceFamilies(occurrence.observations);
  if (lineages.length < 2 || occurrence.observations.length < 3) return null;
  if (families.length >= 3) return null; // stronger bridge lead handles it.

  const e = occurrence.entity;
  return basisLead({
    id: "recurrence-" + slug(e.id),
    kind: "cross_family_recurrence",
    hypothesis:
      e.label +
      " recurs across independent records often enough to justify reconstructing its role without assuming why it recurs.",
    rationale:
      "The entity occurs in " +
      String(occurrence.observations.length) +
      " observations across " +
      String(lineages.length) +
      " independent lineages.",
    basisEvidenceRefs: observationRefs(occurrence.observations),
    entityIds: [e.id],
    independentLineages: lineages,
    documentFamilies: families,
    occurredAtRange: timeRange(occurrence.observations),
    predictedFootprints: [
      "If recurrence reflects a real continuing role, additional role-consistent records should exist in neighboring dates or document families.",
    ],
    falsifiers: [
      "Identity resolution splits the observations into different entities.",
      "All recurrence is explained by passive copying or one administrative artifact.",
    ],
    searchSeeds: [
      e.label + " timeline role",
      e.label + " earlier later record",
      e.label + " independent source",
    ],
  });
}

function temporalLead(
  occurrence: EntityOccurrence,
): InvestigationDiscoveryLead | null {
  const days = eventWindowDays(occurrence.observations);
  const lineages = occurrenceLineages(occurrence.observations);
  const families = occurrenceFamilies(occurrence.observations);
  if (
    days === null ||
    days > 3 ||
    lineages.length < 2 ||
    families.length < 2
  ) {
    return null;
  }

  const e = occurrence.entity;
  const range = timeRange(occurrence.observations);
  return basisLead({
    id: "temporal-" + slug(e.id) + "-" + slug(range.first ?? "undated"),
    kind: "temporal_convergence",
    hypothesis:
      "Independent records involving " +
      e.label +
      " converge within a narrow time window and may reflect one underlying event or coordinated activity.",
    rationale:
      "Multiple independent lineages and document families fall within " +
      days.toFixed(2) +
      " days. Temporal proximity alone does not establish coordination.",
    basisEvidenceRefs: observationRefs(occurrence.observations),
    entityIds: [e.id],
    independentLineages: lineages,
    documentFamilies: families,
    occurredAtRange: range,
    predictedFootprints: [
      "A real common event should produce additional records anchored to the same date window.",
      "Independent participants or logistics records may reconstruct the event from directions that do not start with this entity.",
    ],
    falsifiers: [
      "The records use different event dates despite similar document timestamps.",
      "The overlap is routine recurring activity with no shared event.",
    ],
    searchSeeds: [
      e.label + " " + (range.first ?? "") + " " + (range.last ?? ""),
      e.label + " calendar travel payment message same date",
    ],
  });
}

function expectedGapLeads(
  observations: InvestigationObservation[],
  expectations: InvestigationExpectedFootprint[],
): InvestigationDiscoveryLead[] {
  const families = new Set(observations.map((item) => item.documentFamily));
  const tags = new Set(observations.flatMap((item) => item.eventTags));
  const byEntity = new Map<string, InvestigationObservation[]>();
  for (const observation of observations) {
    for (const entity of observation.entities) {
      byEntity.set(entity.id, [
        ...(byEntity.get(entity.id) ?? []),
        observation,
      ]);
    }
  }

  const out: InvestigationDiscoveryLead[] = [];
  for (const expectation of expectations) {
    const key = clean(expectation.hypothesisKey, "hypothesis_key", 300);
    const description = clean(
      expectation.description,
      "expectation_description",
      4000,
    );
    const expectedFamilies = unique(
      expectation.expectedDocumentFamilies.map((family) =>
        clean(family, "expected_document_family", 300)),
    );
    const expectedTags = unique(
      (expectation.expectedEventTags ?? []).map((tag) =>
        clean(tag, "expected_event_tag", 200)),
    );
    const missingFamilies = expectedFamilies.filter(
      (family) => !families.has(family),
    );
    const missingTags = expectedTags.filter((tag) => !tags.has(tag));
    if (!missingFamilies.length && !missingTags.length) continue;

    const relatedEntityIds = unique(expectation.relatedEntityIds ?? []);
    const related = relatedEntityIds.flatMap(
      (id) => byEntity.get(id) ?? [],
    );
    const basis = related.length ? related : observations;

    out.push(basisLead({
      id: "gap-" + slug(key),
      kind: "expected_footprint_gap",
      hypothesis:
        "If the working hypothesis "" +
        description +
        "" is correct, the missing expected record types should be searched before the hypothesis is strengthened.",
      rationale:
        "Expected-but-not-yet-observed is a search lead, not proof of absence. Missing families: " +
        (missingFamilies.join(", ") || "none") +
        "; missing event tags: " +
        (missingTags.join(", ") || "none") +
        ".",
      basisEvidenceRefs: observationRefs(basis),
      entityIds: relatedEntityIds,
      independentLineages: occurrenceLineages(basis),
      documentFamilies: occurrenceFamilies(basis),
      occurredAtRange: timeRange(basis),
      predictedFootprints: [
        ...missingFamilies.map((family) => "Look for document family: " + family),
        ...missingTags.map((tag) => "Look for event tag: " + tag),
      ],
      falsifiers: [
        "The expected footprint is shown not to exist for ordinary structural reasons.",
        "The working hypothesis is revised so the missing footprint is no longer predicted.",
      ],
      searchSeeds: unique([
        key + " " + missingFamilies.join(" "),
        description + " " + missingTags.join(" "),
      ]).filter((seed) => seed.trim()),
    }));
  }
  return out;
}

function reversePathLeads(
  observations: InvestigationObservation[],
): InvestigationDiscoveryLead[] {
  const pairRefs = new Map<string, {
    a: InvestigationEntityRef;
    b: InvestigationEntityRef;
    observations: InvestigationObservation[];
  }>();

  for (const observation of observations) {
    const entities = observation.entities;
    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        const a = entities[i].id < entities[j].id ? entities[i] : entities[j];
        const b = entities[i].id < entities[j].id ? entities[j] : entities[i];
        const key = a.id + "::" + b.id;
        const current = pairRefs.get(key) ?? { a, b, observations: [] };
        current.observations.push(observation);
        pairRefs.set(key, current);
      }
    }
  }

  return [...pairRefs.values()]
    .filter((pair) => occurrenceLineages(pair.observations).length >= 2)
    .map((pair) => basisLead({
      id: "reverse-" + slug(pair.a.id) + "-" + slug(pair.b.id),
      kind: "reverse_path_check",
      hypothesis:
        "The observed relationship between " +
        pair.a.label +
        " and " +
        pair.b.label +
        " should survive a reverse search that starts from each endpoint independently.",
      rationale:
        "The pair co-occurs in multiple independent lineages. Reverse reconstruction tests whether the edge is robust or retrieval-direction bias.",
      basisEvidenceRefs: observationRefs(pair.observations),
      entityIds: [pair.a.id, pair.b.id],
      independentLineages: occurrenceLineages(pair.observations),
      documentFamilies: occurrenceFamilies(pair.observations),
      occurredAtRange: timeRange(pair.observations),
      predictedFootprints: [
        "Starting from " + pair.a.label + " should independently recover " + pair.b.label + ".",
        "Starting from " + pair.b.label + " should independently recover " + pair.a.label + ".",
      ],
      falsifiers: [
        "One direction depends entirely on the original source chain.",
        "Identity resolution or chronology shows the apparent relationship is spurious.",
      ],
      searchSeeds: [
        pair.a.label + " " + pair.b.label + " independent record",
        pair.b.label + " " + pair.a.label + " chronology role",
      ],
    }));
}

function leadScore(lead: InvestigationDiscoveryLead): number {
  const diversity =
    Math.min(4, lead.independentLineages.length) * 3 +
    Math.min(5, lead.documentFamilies.length) * 2;
  const evidence = Math.min(10, lead.basisEvidenceRefs.length);
  const novelty =
    lead.kind === "bridge_node" ? 6 :
    lead.kind === "expected_footprint_gap" ? 5 :
    lead.kind === "reverse_path_check" ? 4 :
    lead.kind === "temporal_convergence" ? 3 : 2;
  return diversity + evidence + novelty;
}

export function discoverInvestigationLeads(input: {
  observations: InvestigationObservation[];
  expectations?: InvestigationExpectedFootprint[];
  maxLeads?: number;
}): InvestigationDiscoveryResult {
  if (!Array.isArray(input.observations) || input.observations.length > 10_000) {
    throw new Error("investigation_discovery_invalid_observations");
  }
  const observations = input.observations.map(validateObservation);
  const occurrences = entityOccurrences(observations);

  const leads: InvestigationDiscoveryLead[] = [];
  for (const occurrence of occurrences) {
    const bridge = bridgeLead(occurrence);
    if (bridge) leads.push(bridge);
    const recurrence = recurrenceLead(occurrence);
    if (recurrence) leads.push(recurrence);
    const temporal = temporalLead(occurrence);
    if (temporal) leads.push(temporal);
  }

  leads.push(
    ...expectedGapLeads(observations, input.expectations ?? []),
    ...reversePathLeads(observations),
  );

  const maxLeads = Math.max(1, Math.min(input.maxLeads ?? 24, 100));
  const deduped = new Map<string, InvestigationDiscoveryLead>();
  for (const lead of leads) {
    if (!deduped.has(lead.id)) deduped.set(lead.id, lead);
  }

  return {
    leads: [...deduped.values()]
      .sort((a, b) => {
        const delta = leadScore(b) - leadScore(a);
        return delta || a.id.localeCompare(b.id);
      })
      .slice(0, maxLeads),
    observedEntityCount: occurrences.length,
    observedLineageCount: new Set(
      observations.map((item) => item.lineageKey),
    ).size,
    observedDocumentFamilyCount: new Set(
      observations.map((item) => item.documentFamily),
    ).size,
    rules: {
      associationIsNotConduct: true,
      leadIsNotFinding: true,
      repeatedReportingIsNotIndependentCorroboration: true,
    },
  };
}

export function discoveryLeadToPatternHopSeeds(
  lead: InvestigationDiscoveryLead,
): Array<{
  seed: string;
  objective: string;
  maxDepth: 2;
  maxHopsPerAttempt: 4;
}> {
  return lead.searchSeeds.slice(0, 4).map((seed, index) => ({
    seed,
    objective:
      "Test investigation hypothesis " +
      lead.id +
      " (" +
      lead.kind +
      "), route " +
      String(index + 1) +
      ". Seek primary records, independent source lineages, counterevidence, " +
      "identity-resolution failures and chronology conflicts. The lead is not a finding.",
    maxDepth: 2 as const,
    maxHopsPerAttempt: 4 as const,
  }));
}
