export type InvestigationGraphNode = {
  id: string;
  label: string;
};

export type InvestigationGraphEdge = {
  id: string;
  leftNodeId: string;
  rightNodeId: string;
  evidenceRefs: string[];
  lineageKeys: string[];
};

export type InvestigationCounterfactualImpact = {
  nodeId: string;
  componentsBefore: number;
  componentsAfterRemoval: number;
  componentIncrease: number;
  reachablePairLoss: number;
  affectedNeighborIds: string[];
  status: "structural_bridge" | "low_structural_impact";
  note:
    "Structural graph importance is not evidence of wrongdoing, authority, or intent.";
};

function text(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("counterfactual_graph_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  minItems = 1,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      value.length < minItems ||
      value.length > maxItems) {
    throw new Error("counterfactual_graph_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("counterfactual_graph_duplicate_" + field);
  }
  return out;
}

function componentSizes(
  nodeIds: string[],
  edges: InvestigationGraphEdge[],
  removedNodeId?: string,
): number[] {
  const active = nodeIds.filter((id) => id !== removedNodeId);
  const adjacency = new Map(active.map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    if (
      edge.leftNodeId === removedNodeId ||
      edge.rightNodeId === removedNodeId
    ) {
      continue;
    }
    if (!adjacency.has(edge.leftNodeId) || !adjacency.has(edge.rightNodeId)) {
      continue;
    }
    adjacency.get(edge.leftNodeId)!.add(edge.rightNodeId);
    adjacency.get(edge.rightNodeId)!.add(edge.leftNodeId);
  }

  const visited = new Set<string>();
  const sizes: number[] = [];
  for (const start of active) {
    if (visited.has(start)) continue;
    const stack = [start];
    visited.add(start);
    let size = 0;
    while (stack.length) {
      const current = stack.pop()!;
      size += 1;
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

function reachablePairs(sizes: number[]): number {
  return sizes.reduce((sum, size) => sum + (size * (size - 1)) / 2, 0);
}

function componentSizeForNode(
  nodeId: string,
  nodeIds: string[],
  edges: InvestigationGraphEdge[],
): number {
  const adjacency = new Map(nodeIds.map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    adjacency.get(edge.leftNodeId)?.add(edge.rightNodeId);
    adjacency.get(edge.rightNodeId)?.add(edge.leftNodeId);
  }
  const visited = new Set<string>([nodeId]);
  const stack = [nodeId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      stack.push(next);
    }
  }
  return visited.size;
}

export function analyzeCounterfactualGraph(input: {
  nodes: InvestigationGraphNode[];
  edges: InvestigationGraphEdge[];
}): InvestigationCounterfactualImpact[] {
  if (!Array.isArray(input.nodes) ||
      input.nodes.length < 1 ||
      input.nodes.length > 500) {
    throw new Error("counterfactual_graph_invalid_nodes");
  }
  if (!Array.isArray(input.edges) || input.edges.length > 5000) {
    throw new Error("counterfactual_graph_invalid_edges");
  }

  const nodes = input.nodes.map((node) => ({
    id: text(node.id, "node_id", 300),
    label: text(node.label, "node_label", 1000),
  }));
  if (new Set(nodes.map((node) => node.id)).size !== nodes.length) {
    throw new Error("counterfactual_graph_duplicate_node_id");
  }
  const nodeIds = nodes.map((node) => node.id);
  const nodeSet = new Set(nodeIds);

  const edges = input.edges.map((edge) => {
    const normalized = {
      id: text(edge.id, "edge_id", 300),
      leftNodeId: text(edge.leftNodeId, "left_node_id", 300),
      rightNodeId: text(edge.rightNodeId, "right_node_id", 300),
      evidenceRefs: strings(edge.evidenceRefs, "edge_evidence_refs"),
      lineageKeys: strings(edge.lineageKeys, "edge_lineage_keys"),
    };
    if (
      normalized.leftNodeId === normalized.rightNodeId ||
      !nodeSet.has(normalized.leftNodeId) ||
      !nodeSet.has(normalized.rightNodeId)
    ) {
      throw new Error("counterfactual_graph_invalid_edge_endpoints");
    }
    return normalized;
  });
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length) {
    throw new Error("counterfactual_graph_duplicate_edge_id");
  }

  const baselineSizes = componentSizes(nodeIds, edges);
  const componentsBefore = baselineSizes.length;
  const baselinePairs = reachablePairs(baselineSizes);

  return nodes
    .map((node) => {
      const afterSizes = componentSizes(nodeIds, edges, node.id);
      const componentsAfterRemoval = afterSizes.length;
      const originalComponentSize = componentSizeForNode(
        node.id,
        nodeIds,
        edges,
      );
      const remainingBaselinePairs =
        baselinePairs - Math.max(0, originalComponentSize - 1);
      const pairLoss = Math.max(
        0,
        remainingBaselinePairs - reachablePairs(afterSizes),
      );
      const affectedNeighborIds = [
        ...new Set(
          edges.flatMap((edge) => {
            if (edge.leftNodeId === node.id) return [edge.rightNodeId];
            if (edge.rightNodeId === node.id) return [edge.leftNodeId];
            return [];
          }),
        ),
      ].sort();
      const componentIncrease = Math.max(
        0,
        componentsAfterRemoval - componentsBefore,
      );

      return {
        nodeId: node.id,
        componentsBefore,
        componentsAfterRemoval,
        componentIncrease,
        reachablePairLoss: pairLoss,
        affectedNeighborIds,
        status:
          componentIncrease > 0 || pairLoss > 0
            ? "structural_bridge"
            : "low_structural_impact",
        note:
          "Structural graph importance is not evidence of wrongdoing, authority, or intent.",
      } satisfies InvestigationCounterfactualImpact;
    })
    .sort((a, b) => {
      const componentDelta = b.componentIncrease - a.componentIncrease;
      if (componentDelta) return componentDelta;
      const pairDelta = b.reachablePairLoss - a.reachablePairLoss;
      if (pairDelta) return pairDelta;
      return a.nodeId.localeCompare(b.nodeId);
    });
}
