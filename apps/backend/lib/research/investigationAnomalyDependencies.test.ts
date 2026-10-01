import { describe, expect, it } from "vitest";
import { collapseAnomalyDependencies } from "./investigationAnomalyDependencies";

describe("anomaly dependency tree", () => {
  it("collapses many downstream oddities under one upstream anomaly instead of counting them independently", () => {
    const result = collapseAnomalyDependencies({
      anomalies: [
        {
          id: "root",
          description: "Potential identity merge error.",
          evidenceRefs: ["e-root"],
          dependsOnIds: [],
          status: "unresolved",
        },
        {
          id: "child-1",
          description: "Unexpected relationship.",
          evidenceRefs: ["e1"],
          dependsOnIds: ["root"],
          status: "unresolved",
        },
        {
          id: "child-2",
          description: "Unexpected chronology.",
          evidenceRefs: ["e2"],
          dependsOnIds: ["root"],
          status: "unresolved",
        },
        {
          id: "grandchild",
          description: "Unexpected property edge.",
          evidenceRefs: ["e3"],
          dependsOnIds: ["child-1"],
          status: "unresolved",
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      rootId: "root",
      descendantIds: ["child-1", "child-2", "grandchild"],
    });
    expect(result[0].note).toContain("not counted as independent signals");
  });

  it("resolved descendants remain in history but not the active unresolved set", () => {
    const result = collapseAnomalyDependencies({
      anomalies: [
        {
          id: "root",
          description: "Root.",
          evidenceRefs: ["e-root"],
          dependsOnIds: [],
          status: "unresolved",
        },
        {
          id: "child",
          description: "Child.",
          evidenceRefs: ["e-child"],
          dependsOnIds: ["root"],
          status: "resolved",
        },
      ],
    });

    expect(result[0].descendantIds).toEqual(["child"]);
    expect(result[0].unresolvedDescendantIds).toEqual([]);
  });

  it("rejects cycles because a circular anomaly explanation has no trustworthy root", () => {
    expect(() => collapseAnomalyDependencies({
      anomalies: [
        {
          id: "a",
          description: "A",
          evidenceRefs: ["ea"],
          dependsOnIds: ["b"],
          status: "unresolved",
        },
        {
          id: "b",
          description: "B",
          evidenceRefs: ["eb"],
          dependsOnIds: ["a"],
          status: "unresolved",
        },
      ],
    })).toThrow("anomaly_dependency_cycle");
  });
});
