import { describe, expect, it } from "vitest";
import { analyzeCounterfactualGraph } from "./investigationCounterfactualGraph";

describe("counterfactual investigation graph", () => {
  it("shows when removing a quiet intermediary breaks an otherwise connected graph", () => {
    const impacts = analyzeCounterfactualGraph({
      nodes: [
        { id: "a", label: "Node A" },
        { id: "bridge", label: "Quiet Intermediary" },
        { id: "b", label: "Node B" },
        { id: "c", label: "Node C" },
      ],
      edges: [
        {
          id: "e1",
          leftNodeId: "a",
          rightNodeId: "bridge",
          evidenceRefs: ["evidence:1"],
          lineageKeys: ["lineage:1"],
        },
        {
          id: "e2",
          leftNodeId: "bridge",
          rightNodeId: "b",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
        },
        {
          id: "e3",
          leftNodeId: "bridge",
          rightNodeId: "c",
          evidenceRefs: ["evidence:3"],
          lineageKeys: ["lineage:3"],
        },
      ],
    });

    const bridge = impacts.find((item) => item.nodeId === "bridge");
    expect(bridge).toMatchObject({
      status: "structural_bridge",
      componentIncrease: 2,
      reachablePairLoss: 3,
      affectedNeighborIds: ["a", "b", "c"],
    });
    expect(bridge?.note).toContain("not evidence of wrongdoing");
  });

  it("does not label an ordinary leaf as structurally important merely because it has one edge", () => {
    const impacts = analyzeCounterfactualGraph({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
      edges: [
        {
          id: "e1",
          leftNodeId: "a",
          rightNodeId: "b",
          evidenceRefs: ["evidence:1"],
          lineageKeys: ["lineage:1"],
        },
        {
          id: "e2",
          leftNodeId: "b",
          rightNodeId: "c",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
        },
      ],
    });

    expect(impacts.find((item) => item.nodeId === "a")).toMatchObject({
      status: "low_structural_impact",
      componentIncrease: 0,
      reachablePairLoss: 0,
    });
    expect(impacts.find((item) => item.nodeId === "b")?.status)
      .toBe("structural_bridge");
  });

  it("handles disconnected graphs without pretending every removal causes a pair loss", () => {
    const impacts = analyzeCounterfactualGraph({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "x", label: "X" },
        { id: "y", label: "Y" },
      ],
      edges: [
        {
          id: "e1",
          leftNodeId: "a",
          rightNodeId: "b",
          evidenceRefs: ["evidence:1"],
          lineageKeys: ["lineage:1"],
        },
        {
          id: "e2",
          leftNodeId: "x",
          rightNodeId: "y",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
        },
      ],
    });

    expect(impacts.every((item) => item.reachablePairLoss === 0)).toBe(true);
  });

  it("requires every graph edge to carry evidence and source lineage", () => {
    expect(() => analyzeCounterfactualGraph({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      edges: [{
        id: "e1",
        leftNodeId: "a",
        rightNodeId: "b",
        evidenceRefs: [],
        lineageKeys: ["lineage:1"],
      }],
    })).toThrow("counterfactual_graph_invalid_edge_evidence_refs");
  });

  it("rejects edges to invented nodes instead of silently expanding the graph", () => {
    expect(() => analyzeCounterfactualGraph({
      nodes: [{ id: "a", label: "A" }],
      edges: [{
        id: "e1",
        leftNodeId: "a",
        rightNodeId: "invented",
        evidenceRefs: ["evidence:1"],
        lineageKeys: ["lineage:1"],
      }],
    })).toThrow("counterfactual_graph_invalid_edge_endpoints");
  });
});
