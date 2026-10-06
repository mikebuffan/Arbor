import { analyzeKnowledgeState } from "./investigationKnowledgeState";
import { evaluateTemporalConstraints } from "./investigationTemporalConstraints";
import { inferMissingFunction } from "./investigationMissingFunction";
import { analyzeVersionDrift } from "./investigationVersionDrift";
import { detectRoleActionMismatches } from "./investigationRoleMismatch";
import { labelEvidenceTemperature } from "./investigationEvidenceTemperature";
import { analyzeWhyNow } from "./investigationWhyNow";
import { compareParallelReconstructions } from "./investigationParallelReconstruction";
import { evaluateCompetingTheories } from "./investigationCompetingTheories";
import { collapseAnomalyDependencies } from "./investigationAnomalyDependencies";
import { detectDocumentFamilyCollisions } from "./investigationDocumentFamilyCollision";
import { analyzeDecisionProvenance } from "./investigationDecisionProvenance";
import type { ResearchUnitHandler } from "./researchUnitDispatcher";

export type InvestigationCaseworkPacket =
  | {
      id: string;
      kind: "knowledge_state";
      evidenceRefs: string[];
      payload: Parameters<typeof analyzeKnowledgeState>[0];
    }
  | {
      id: string;
      kind: "temporal_constraints";
      evidenceRefs: string[];
      payload: Parameters<typeof evaluateTemporalConstraints>[0];
    }
  | {
      id: string;
      kind: "missing_function";
      evidenceRefs: string[];
      payload: Parameters<typeof inferMissingFunction>[0];
    }
  | {
      id: string;
      kind: "version_drift";
      evidenceRefs: string[];
      payload: Parameters<typeof analyzeVersionDrift>[0];
    }
  | {
      id: string;
      kind: "role_mismatch";
      evidenceRefs: string[];
      payload: Parameters<typeof detectRoleActionMismatches>[0];
    }
  | {
      id: string;
      kind: "evidence_temperature";
      evidenceRefs: string[];
      payload: {
        items: Array<Parameters<typeof labelEvidenceTemperature>[0]>;
      };
    }
  | {
      id: string;
      kind: "why_now";
      evidenceRefs: string[];
      payload: Parameters<typeof analyzeWhyNow>[0];
    }
  | {
      id: string;
      kind: "parallel_reconstruction";
      evidenceRefs: string[];
      payload: Parameters<typeof compareParallelReconstructions>[0];
    }
  | {
      id: string;
      kind: "competing_theories";
      evidenceRefs: string[];
      payload: Parameters<typeof evaluateCompetingTheories>[0];
    }
  | {
      id: string;
      kind: "anomaly_dependencies";
      evidenceRefs: string[];
      payload: Parameters<typeof collapseAnomalyDependencies>[0];
    }
  | {
      id: string;
      kind: "document_family_collision";
      evidenceRefs: string[];
      payload: Parameters<typeof detectDocumentFamilyCollisions>[0];
    }
  | {
      id: string;
      kind: "decision_provenance";
      evidenceRefs: string[];
      payload: Parameters<typeof analyzeDecisionProvenance>[0];
    };

export type TrustedInvestigationCaseworkStore = {
  loadPacket(input: {
    ownerId: string;
    projectId: string;
    packetId: string;
  }): Promise<InvestigationCaseworkPacket | null>;
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_casework_invalid_" + field);
  }
  return value.trim();
}

function runPacket(packet: InvestigationCaseworkPacket): unknown {
  switch (packet.kind) {
    case "knowledge_state":
      return analyzeKnowledgeState(packet.payload);
    case "temporal_constraints":
      return evaluateTemporalConstraints(packet.payload);
    case "missing_function":
      return inferMissingFunction(packet.payload);
    case "version_drift":
      return analyzeVersionDrift(packet.payload);
    case "role_mismatch":
      return detectRoleActionMismatches(packet.payload);
    case "evidence_temperature":
      return packet.payload.items.map(labelEvidenceTemperature);
    case "why_now":
      return analyzeWhyNow(packet.payload);
    case "parallel_reconstruction":
      return compareParallelReconstructions(packet.payload);
    case "competing_theories":
      return evaluateCompetingTheories(packet.payload);
    case "anomaly_dependencies":
      return collapseAnomalyDependencies(packet.payload);
    case "document_family_collision":
      return detectDocumentFamilyCollisions(packet.payload);
    case "decision_provenance":
      return analyzeDecisionProvenance(packet.payload);
  }
}

export function buildInvestigationCaseworkUnitHandler(
  store: TrustedInvestigationCaseworkStore,
): ResearchUnitHandler {
  return async ({ session, claim, at }) => {
    const packetId = text(claim.payload.packetId, "packet_id", 300);
    const packet = await store.loadPacket({
      ownerId: session.userId,
      projectId: session.projectId,
      packetId,
    });
    if (!packet) {
      throw new Error("investigation_casework_packet_not_found");
    }
    if (packet.id !== packetId) {
      throw new Error("investigation_casework_packet_mismatch");
    }
    if (!Array.isArray(packet.evidenceRefs) ||
        packet.evidenceRefs.length < 1 ||
        packet.evidenceRefs.length > 100 ||
        packet.evidenceRefs.some(
          (ref) => typeof ref !== "string" || !ref.trim(),
        )) {
      throw new Error("investigation_casework_invalid_packet_evidence");
    }

    const trustedSessionEvidence = new Set(session.completedEvidenceRefs);
    if (packet.evidenceRefs.some((ref) => !trustedSessionEvidence.has(ref))) {
      throw new Error("investigation_casework_untrusted_packet_evidence");
    }

    const output = runPacket(packet);
    return {
      sessionId: session.id,
      unitId: claim.unitId,
      idempotencyKey: claim.idempotencyKey,
      status: "completed",
      recordedAt: at,
      costCents: 0,
      evidenceRefs: [...new Set(packet.evidenceRefs)],
      unresolvedRequiredWork: Math.max(
        0,
        session.unresolvedRequiredWork - 1,
      ),
      result: {
        caseworkPacketId: packet.id,
        caseworkKind: packet.kind,
        caseworkOutput: output,
        independentlyVerifiedFinding: false,
      },
    };
  };
}
