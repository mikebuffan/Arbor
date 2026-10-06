import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvestigationEntityKind,
  InvestigationObservation,
} from "./investigationDiscovery";
import type {
  TrustedInvestigationObservationStore,
} from "./investigationDiscoveryUnit";

const ENTITY_KINDS: InvestigationEntityKind[] = [
  "person",
  "organization",
  "company",
  "address",
  "property",
  "aircraft",
  "phone",
  "email",
  "account",
  "attorney",
  "official",
  "document_author",
  "other",
];

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("investigation_observation_store_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_observation_store_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error("investigation_observation_store_invalid_" + field);
  }
  return value.map((item) => text(item, field, 1000));
}

function occurredAt(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = text(value, "occurred_at", 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("investigation_observation_store_invalid_occurred_at");
  }
  return raw;
}

function entity(value: unknown) {
  const r = object(value, "entity");
  const kind = text(r.kind, "entity_kind", 100) as InvestigationEntityKind;
  if (!ENTITY_KINDS.includes(kind)) {
    throw new Error("investigation_observation_store_invalid_entity_kind");
  }
  return {
    id: text(r.id, "entity_id", 1000),
    label: text(r.label, "entity_label", 2000),
    kind,
  };
}

function observation(value: unknown): InvestigationObservation {
  const r = object(value, "observation");
  if (!Array.isArray(r.entities) || r.entities.length > 100) {
    throw new Error("investigation_observation_store_invalid_entities");
  }
  return {
    evidenceRef: text(r.evidenceRef, "evidence_ref", 300),
    lineageKey: text(r.lineageKey, "lineage_key", 1000),
    documentFamily: text(r.documentFamily, "document_family", 1000),
    occurredAt: occurredAt(r.occurredAt),
    eventTags: strings(r.eventTags ?? [], "event_tags", 100),
    entities: r.entities.map(entity),
  };
}

function uuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Service-role-only adapter for the PROPOSED discovery observation SQL.
 * The caller supplies owner/project from trusted authorization. Evidence IDs
 * are persisted integrity-evidence UUIDs, not free-form model evidence.
 */
export class SupabaseInvestigationObservationStore
implements TrustedInvestigationObservationStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly ownerId: string,
    private readonly projectId: string,
  ) {
    if (!uuidLike(ownerId) || !uuidLike(projectId)) {
      throw new Error("investigation_observation_store_requires_scoped_identity");
    }
  }

  async loadObservations(input: {
    ownerId: string;
    projectId: string;
    evidenceRefs: string[];
  }): Promise<InvestigationObservation[]> {
    if (
      input.ownerId !== this.ownerId ||
      input.projectId !== this.projectId
    ) {
      throw new Error("investigation_observation_store_scope_mismatch");
    }
    if (
      !Array.isArray(input.evidenceRefs) ||
      input.evidenceRefs.length < 1 ||
      input.evidenceRefs.length > 100 ||
      input.evidenceRefs.some((ref) => !uuidLike(ref))
    ) {
      throw new Error("investigation_observation_store_invalid_evidence_refs");
    }

    const { data, error } = await this.db.rpc(
      "arbor_load_investigation_observations",
      {
        p_evidence_ids: input.evidenceRefs,
        p_user_id: this.ownerId,
        p_project_id: this.projectId,
      },
    );
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("investigation_observation_store_invalid_response");
    }

    return data.map(observation);
  }
}
