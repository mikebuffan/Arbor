import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INVESTIGATION_ASSERTION_KINDS,
  INVESTIGATION_EVIDENCE_CLASSES,
  type FalsificationAttempt,
  type InvestigationAssertionKind,
  type InvestigationEvidenceAtom,
  type InvestigationEvidenceClass,
  type NegativeEvidenceState,
} from "./investigationIntegrity";
import type {
  PersistedInvestigationFindingContext,
  TrustedInvestigationFindingStore,
} from "./investigationIntegrityStore";

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_investigation_integrity_db_" + field);
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  field: string,
  min = 1,
  max = 100_000,
): string {
  if (typeof value !== "string") {
    throw new Error("invalid_investigation_integrity_db_" + field);
  }
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new Error("invalid_investigation_integrity_db_" + field);
  }
  return clean;
}

function nullableText(
  value: unknown,
  field: string,
  max = 100_000,
): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field, 1, max);
}

function strings(
  value: unknown,
  field: string,
  maxItems = 100,
  allowEmpty = true,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems ||
      (!allowEmpty && value.length === 0)) {
    throw new Error("invalid_investigation_integrity_db_" + field);
  }
  const out = value.map((item) => text(item, field, 1, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("invalid_investigation_integrity_db_" + field + "_duplicate");
  }
  return out;
}

function evidenceClass(value: unknown): InvestigationEvidenceClass {
  const clean = text(value, "evidence_class", 1, 100);
  if (!INVESTIGATION_EVIDENCE_CLASSES.includes(
    clean as InvestigationEvidenceClass,
  )) {
    throw new Error("invalid_investigation_integrity_db_evidence_class");
  }
  return clean as InvestigationEvidenceClass;
}

function assertionKind(value: unknown): InvestigationAssertionKind {
  const clean = text(value, "assertion_kind", 1, 100);
  if (!INVESTIGATION_ASSERTION_KINDS.includes(
    clean as InvestigationAssertionKind,
  )) {
    throw new Error("invalid_investigation_integrity_db_assertion_kind");
  }
  return clean as InvestigationAssertionKind;
}

function supportKinds(value: unknown): InvestigationAssertionKind[] {
  const raw = strings(value, "evidence_supports", 8, false);
  const out = raw.map((item) => assertionKind(item));
  if (new Set(out).size !== out.length) {
    throw new Error("invalid_investigation_integrity_db_evidence_supports_duplicate");
  }
  return out;
}

function evidenceAtom(value: unknown): InvestigationEvidenceAtom {
  const r = record(value, "support_evidence");
  return {
    id: text(r.id, "evidence_id", 1, 300),
    evidenceClass: evidenceClass(r.evidenceClass),
    sourceRef: text(r.sourceRef, "source_ref", 1, 1000),
    lineageKey: text(r.lineageKey, "lineage_key", 1, 1000),
    content: text(r.content, "evidence_content", 1, 1_000_000),
    contentSha256: (() => {
      const hash = text(r.contentSha256, "content_sha256", 64, 64);
      if (!/^[0-9a-f]{64}$/.test(hash)) {
        throw new Error("invalid_investigation_integrity_db_content_sha256");
      }
      return hash;
    })(),
    supports: supportKinds(r.supports),
    underlyingSourceRef: nullableText(
      r.underlyingSourceRef,
      "underlying_source_ref",
      1000,
    ),
  };
}

function support(value: unknown): InvestigationEvidenceAtom[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("invalid_investigation_integrity_db_support");
  }
  const out = value.map(evidenceAtom);
  const ids = out.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("invalid_investigation_integrity_db_support_duplicate");
  }
  return out;
}

function falsification(value: unknown): FalsificationAttempt[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("invalid_investigation_integrity_db_falsification_attempts");
  }
  const ids = new Set<string>();
  return value.map((item) => {
    const r = record(item, "falsification_attempt");
    const id = text(r.id, "falsification_id", 1, 300);
    if (ids.has(id)) {
      throw new Error(
        "invalid_investigation_integrity_db_falsification_id_duplicate",
      );
    }
    ids.add(id);
    const result = text(r.result, "falsification_result", 1, 30);
    if (!["claim_survived", "claim_failed", "inconclusive"].includes(result)) {
      throw new Error(
        "invalid_investigation_integrity_db_falsification_result",
      );
    }
    return {
      id,
      hypothesis: text(r.hypothesis, "falsification_hypothesis", 1, 10_000),
      result: result as FalsificationAttempt["result"],
      evidenceRefs: strings(
        r.evidenceRefs,
        "falsification_evidence_refs",
        100,
      ),
    };
  });
}

const negativeStates: NegativeEvidenceState[] = [
  "NOT_FOUND_IN_SEARCHED_SCOPE",
  "SOURCE_SILENT",
  "EXPECTED_BUT_MISSING",
  "PROVEN_ABSENT",
];

function negativeEvidence(
  value: unknown,
): PersistedInvestigationFindingContext["negativeEvidence"] {
  if (value === null || value === undefined) return null;
  const r = record(value, "negative_evidence");
  const state = text(r.state, "negative_evidence_state", 1, 100);
  if (!negativeStates.includes(state as NegativeEvidenceState)) {
    throw new Error(
      "invalid_investigation_integrity_db_negative_evidence_state",
    );
  }
  const proofRef = nullableText(
    r.proofRef,
    "negative_evidence_proof_ref",
    1000,
  );
  if (state === "PROVEN_ABSENT" && !proofRef) {
    throw new Error(
      "invalid_investigation_integrity_db_negative_evidence_proof_ref",
    );
  }
  return {
    state: state as NegativeEvidenceState,
    scope: text(r.scope, "negative_evidence_scope", 1, 10_000),
    proofRef,
  };
}

function findingContext(value: unknown): PersistedInvestigationFindingContext {
  const r = record(value, "finding_context");
  return {
    claimId: text(r.claimId, "claim_id", 1, 300),
    claimText: text(r.claimText, "claim_text", 1, 100_000),
    assertionKind: assertionKind(r.assertionKind),
    support: support(r.support),
    counterEvidenceRefs: strings(
      r.counterEvidenceRefs,
      "counter_evidence_refs",
      100,
    ),
    unresolvedContradictionIds: strings(
      r.unresolvedContradictionIds,
      "unresolved_contradiction_ids",
      100,
    ),
    falsificationAttempts: falsification(r.falsificationAttempts),
    negativeEvidence: negativeEvidence(r.negativeEvidence),
  };
}

/**
 * Source-only adapter for the PROPOSED append-only investigation integrity SQL.
 * The caller must provide owner/project from trusted server authorization.
 * This does not register a worker, grant source access, or apply any migration.
 */
export class SupabaseInvestigationIntegrityStore
implements TrustedInvestigationFindingStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly ownerId: string,
    private readonly projectId: string,
  ) {
    if (!ownerId.trim() || !projectId.trim()) {
      throw new Error("investigation_integrity_store_scope_required");
    }
  }

  async loadFindingContext(input: {
    ownerId: string;
    projectId: string;
    claimId: string;
  }): Promise<PersistedInvestigationFindingContext | null> {
    if (
      input.ownerId !== this.ownerId ||
      input.projectId !== this.projectId
    ) {
      throw new Error("investigation_integrity_store_scope_mismatch");
    }

    const claimId = text(input.claimId, "claim_id", 1, 300);
    const { data, error } = await this.db.rpc(
      "arbor_load_investigation_finding_context",
      {
        p_claim_id: claimId,
        p_user_id: this.ownerId,
        p_project_id: this.projectId,
      },
    );
    if (error) throw error;
    if (data === null) return null;

    const context = findingContext(data);
    if (context.claimId !== claimId) {
      throw new Error("investigation_integrity_store_claim_mismatch");
    }
    return context;
  }
}
