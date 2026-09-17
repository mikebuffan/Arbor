import { CogMoleculeRuntime } from "./runtime.js";
import type { CogChallenge, CogPacket, MoleculeResult, ReleaseProjection } from "./types.js";

export type MoleculeNode = {
  id: string;
  runtime: CogMoleculeRuntime;
};

export type LinearArm = {
  id: string;
  from: string;
  to: string;
  project(release: ReleaseProjection, destination: string): Promise<CogPacket>;
};

export type MoleculeTrace = {
  node: string;
  result: MoleculeResult;
  kind?: "forward" | "repair";
};

export type MoleculeRunResult = {
  result: MoleculeResult;
  trace: MoleculeTrace[];
  computeSpent: number;
  repairs: number;
};

export type FeedbackPolicy = {
  maxRepairs?: number;
  selectChallenge?(node: string, result: MoleculeResult): CogChallenge | undefined;
};

export class MoleculeRuntime {
  private readonly nodes = new Map<string, MoleculeNode>();
  private readonly arms: LinearArm[];

  constructor(nodes: MoleculeNode[], arms: LinearArm[]) {
    for (const node of nodes) {
      if (this.nodes.has(node.id)) throw new Error(`duplicate_molecule_node:${node.id}`);
      this.nodes.set(node.id, node);
    }
    this.arms = arms;
  }

  async run(startNode: string, initial: CogPacket, feedback: FeedbackPolicy = {}): Promise<MoleculeRunResult> {
    const trace: MoleculeTrace[] = [];
    const snapshots = new Map<string, CogPacket>();
    let nodeId = startNode;
    let packet = structuredClone(initial);
    let computeSpent = 0;
    let repairs = 0;
    const maxRepairs = feedback.maxRepairs ?? 8;

    while (true) {
      snapshots.set(nodeId, structuredClone(packet));
      const node = this.requireNode(nodeId);
      const result = await node.runtime.run(packet);
      trace.push({ node: nodeId, result, kind: repairs ? "repair" : "forward" });
      computeSpent += result.computeSpent;

      const challenge = feedback.selectChallenge?.(nodeId, result) ?? firstUnresolvedChallenge(result);
      if (challenge && repairs < maxRepairs) {
        const upstreamId = challenge.target.split(":", 1)[0];
        const upstreamSnapshot = snapshots.get(upstreamId);
        if (upstreamSnapshot && upstreamId !== nodeId) {
          repairs += 1;
          packet = this.reopen(upstreamSnapshot, challenge);
          nodeId = upstreamId;
          continue;
        }
      }

      if (!result.projection) return { result, trace, computeSpent, repairs };

      const arm = this.arms.find((candidate) => candidate.from === nodeId);
      if (!arm) return { result, trace, computeSpent, repairs };

      packet = await arm.project(result.projection, arm.to);
      packet.destination = arm.to;
      packet.provenance = unique([
        ...packet.provenance,
        ...result.projection.provenance,
        `arm:${arm.id}`,
        `node:${nodeId}`,
      ]);
      nodeId = arm.to;
    }
  }

  reopen(upstream: CogPacket, challenge: CogChallenge): CogPacket {
    const packet = structuredClone(upstream);
    const existing = packet.challenges.find((candidate) => candidate.id === challenge.id);
    if (!existing) packet.challenges.push(structuredClone(challenge));
    packet.unresolved = unique([...packet.unresolved, challenge.target]);
    packet.metadata = {
      ...packet.metadata,
      reopenedBy: challenge.source,
      reopenedTarget: challenge.target,
    };
    return packet;
  }

  private requireNode(id: string): MoleculeNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`unknown_molecule_node:${id}`);
    return node;
  }
}

export function createLinearArm(
  id: string,
  from: string,
  to: string,
  map: (release: ReleaseProjection, destination: string) => CogPacket | Promise<CogPacket>,
): LinearArm {
  return { id, from, to, project: async (release, destination) => map(release, destination) };
}

function firstUnresolvedChallenge(result: MoleculeResult): CogChallenge | undefined {
  return result.packet.challenges.find((challenge) => !challenge.resolved);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}