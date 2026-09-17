import type { CogPacket, ReleaseProjection } from "./types.js";

export type InterfaceField = "ordered" | "provenance" | "confidence" | "friction" | "reasons";
export type DestinationInterface = { destination: string; fields: InterfaceField[] };

export class AdaptiveLinearInterface {
  private readonly contracts = new Map<string, DestinationInterface>();

  register(contract: DestinationInterface): void { this.contracts.set(contract.destination, structuredClone(contract)); }

  project(release: ReleaseProjection, destination: string): CogPacket {
    const contract = this.contracts.get(destination) ?? { destination, fields: ["ordered", "provenance", "confidence", "friction"] as InterfaceField[] };
    const metadata: Record<string, unknown> = {};
    for (const field of contract.fields) metadata[field] = release[field];
    return {
      id: `${release.packet.id}->${destination}`,
      destination,
      evidence: [{ id: `projection:${release.packet.id}`, value: release.ordered, provenance: release.provenance, confidence: release.confidence }],
      hypotheses: [], unresolved: [], challenges: [], provenance: [...release.provenance],
      friction: release.friction, circulation: 0, metadata,
    };
  }
}