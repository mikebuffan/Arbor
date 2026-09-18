import { createHash } from "node:crypto";

export type ClaimClass = "fact" | "allegation" | "inference";
export type ResolutionState = "resolved" | "ambiguous" | "conflicting" | "unknown";
export type EvidenceRelation = "supports" | "contradicts" | "qualifies" | "association-only";

export interface SourceLocator {
  documentId: string;
  page?: number;
  lineStart?: number;
  lineEnd?: number;
  section?: string;
}

export interface EvidencePacket {
  evidenceId: string;
  documentId: string;
  sourceUri: string;
  acquiredAt: string;
  contentHash: string;
  fileFamilyId?: string;
  originId?: string;
  locator: SourceLocator;
  documentDate?: string;
  eventDate?: string;
  publicationDate?: string;
  ingestionDate: string;
  claim: { text: string; classification: ClaimClass };
  confidence: number;
  entityResolution: { state: ResolutionState; entityIds: string[]; notes?: string };
  contradiction: { state: ResolutionState; evidenceIds: string[] };
  sourceIndependence: { state: ResolutionState; familyIds: string[]; notes?: string };
  relation: EvidenceRelation;
  context?: Record<string, unknown>;
  causalContext?: string[];
  validFrom?: string;
  validUntil?: string;
  hopHistory: { reason: string; at: string; sourceId?: string }[];
  activeObjective: string;
}

export function sha256(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertEvidencePacket(packet: EvidencePacket): EvidencePacket {
  if (!packet.evidenceId || !packet.documentId || !packet.sourceUri) throw new Error("evidence identity/provenance required");
  if (!packet.locator?.documentId || packet.locator.documentId !== packet.documentId) throw new Error("exact source locator required");
  if (!/^[a-f0-9]{64}$/i.test(packet.contentHash)) throw new Error("sha256 content hash required");
  if (!packet.claim?.text.trim()) throw new Error("atomic claim required");
  if (packet.confidence < 0 || packet.confidence > 1) throw new Error("confidence must be 0..1");
  if (!packet.activeObjective.trim()) throw new Error("active objective required");
  return packet;
}

export function roundTripEvidencePacket(packet: EvidencePacket): EvidencePacket {
  assertEvidencePacket(packet);
  return assertEvidencePacket(JSON.parse(JSON.stringify(packet)) as EvidencePacket);
}
