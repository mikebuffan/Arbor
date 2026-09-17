import type { CogPacket, ReleaseProjection } from "./types.js";

export type BridgePolicy = {
  id: string;
  from: string;
  to: string;
  allowedMetadata: string[];
};

export class SubsystemBridge {
  constructor(private readonly policy: BridgePolicy) {}

  transfer(release: ReleaseProjection): CogPacket {
    const metadata: Record<string, unknown> = { bridge: this.policy.id, sourceSubsystem: this.policy.from };
    for (const key of this.policy.allowedMetadata) {
      if (key in release.packet.metadata) metadata[key] = release.packet.metadata[key];
    }
    return {
      id: `${release.packet.id}:bridge:${this.policy.id}`,
      destination: this.policy.to,
      evidence: release.packet.evidence.map((evidence) => structuredClone(evidence)),
      hypotheses: [], unresolved: [], challenges: [],
      provenance: [...release.provenance, `bridge:${this.policy.id}`],
      friction: release.friction, circulation: 0, metadata,
    };
  }
}