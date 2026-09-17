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
};

export type MoleculeRunResult = {
  result: MoleculeResult;
  trace: MoleculeTrace[];
  computeSpent: number;
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

  async run(startNode: string, initial: CogPacket): Promise<MoleculeRunResult> {
    const trace: MoleculeTrace[] = [];
    const visited = new Set<string>();
    let nodeId = startNode;
    let packet = structuredClone(initial);
    let computeSpent = 0;

    while (true) {
      if (visited.has(nodeId)) throw new Error(`molecule_cycle_requires_feedback_controller:${nodeId}`);
      visited.add(nodeId);

      const node = this.requireNode(nodeId);
      const result = await node.runtime.run(packet);
      trace.push({ node: nodeId, result });
      computeSpent += result.computeSpent;

      if (!result.projection) return { result, trace, computeSpent };

      const arm = this.arms.find((candidate) => candidate.from === nodeId);
      if (!arm) return { result, trace, computeSpent };

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

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}