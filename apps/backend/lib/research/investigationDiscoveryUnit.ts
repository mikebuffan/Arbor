import {
  discoverInvestigationLeads,
  type InvestigationExpectedFootprint,
  type InvestigationObservation,
} from "./investigationDiscovery";
import type { ResearchUnitHandler } from "./researchUnitDispatcher";

export type TrustedInvestigationObservationStore = {
  loadObservations(input: {
    ownerId: string;
    projectId: string;
    evidenceRefs: string[];
  }): Promise<InvestigationObservation[]>;
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_discovery_unit_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  allowEmpty = false,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      (!allowEmpty && value.length === 0) ||
      value.length > maxItems) {
    throw new Error("investigation_discovery_unit_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_discovery_unit_duplicate_" + field);
  }
  return out;
}

function expectation(value: unknown): InvestigationExpectedFootprint {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("investigation_discovery_unit_invalid_expectation");
  }
  const r = value as Record<string, unknown>;
  return {
    hypothesisKey: text(r.hypothesisKey, "hypothesis_key", 300),
    description: text(r.description, "expectation_description", 4000),
    expectedDocumentFamilies: strings(
      r.expectedDocumentFamilies,
      "expected_document_families",
      false,
      30,
    ),
    expectedEventTags: r.expectedEventTags === undefined
      ? []
      : strings(r.expectedEventTags, "expected_event_tags", true, 30),
    relatedEntityIds: r.relatedEntityIds === undefined
      ? []
      : strings(r.relatedEntityIds, "related_entity_ids", true, 30),
  };
}

function exactEvidenceScope(
  requested: string[],
  observations: InvestigationObservation[],
): void {
  const returned = new Set(observations.map((item) => item.evidenceRef));
  if (
    requested.some((ref) => !returned.has(ref)) ||
    observations.some((item) => !requested.includes(item.evidenceRef))
  ) {
    throw new Error("investigation_discovery_persisted_observation_mismatch");
  }
}

export function buildInvestigationDiscoveryUnitHandler(
  store: TrustedInvestigationObservationStore,
): ResearchUnitHandler {
  return async ({ session, claim, at }) => {
    const evidenceRefs = strings(
      claim.payload.evidenceRefs,
      "evidence_refs",
      false,
      100,
    );
    const expectationsRaw = claim.payload.expectations;
    const expectations =
      expectationsRaw === null || expectationsRaw === undefined
        ? []
        : Array.isArray(expectationsRaw)
          ? expectationsRaw.map(expectation)
          : (() => {
              throw new Error(
                "investigation_discovery_unit_invalid_expectations",
              );
            })();

    const observations = await store.loadObservations({
      ownerId: session.userId,
      projectId: session.projectId,
      evidenceRefs,
    });
    exactEvidenceScope(evidenceRefs, observations);

    const discovery = discoverInvestigationLeads({
      observations,
      expectations,
      maxLeads: 24,
    });

    return {
      sessionId: session.id,
      unitId: claim.unitId,
      idempotencyKey: claim.idempotencyKey,
      status: "completed",
      recordedAt: at,
      costCents: 0,
      evidenceRefs,
      unresolvedRequiredWork: Math.max(
        0,
        session.unresolvedRequiredWork - 1,
      ),
      result: {
        discoveryLeads: discovery.leads,
        observedEntityCount: discovery.observedEntityCount,
        observedLineageCount: discovery.observedLineageCount,
        observedDocumentFamilyCount:
          discovery.observedDocumentFamilyCount,
        discoveryRules: discovery.rules,
        independentlyVerifiedFinding: false,
      },
    };
  };
}
