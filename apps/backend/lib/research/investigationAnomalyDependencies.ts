export type InvestigationAnomalyDependency = {
  id: string;
  description: string;
  evidenceRefs: string[];
  dependsOnIds: string[];
  status: "unresolved" | "resolved";
};

export type InvestigationAnomalyRoot = {
  rootId: string;
  descendantIds: string[];
  unresolvedDescendantIds: string[];
  evidenceRefs: string[];
  note:
    "Dependent anomalies are not counted as independent signals merely because they are numerous.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("anomaly_dependency_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  min = 0,
  max = 100,
): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error("anomaly_dependency_invalid_" + field);
  }
  return [...new Set(value.map((item) => text(item, field, 1000)))];
}

export function collapseAnomalyDependencies(input: {
  anomalies: InvestigationAnomalyDependency[];
}): InvestigationAnomalyRoot[] {
  if (!Array.isArray(input.anomalies) ||
      input.anomalies.length < 1 ||
      input.anomalies.length > 10_000) {
    throw new Error("anomaly_dependency_invalid_anomalies");
  }
  const byId = new Map<string, InvestigationAnomalyDependency>();
  for (const raw of input.anomalies) {
    const anomaly = {
      id: text(raw.id, "anomaly_id", 300),
      description: text(raw.description, "description", 4000),
      evidenceRefs: strings(raw.evidenceRefs, "evidence_refs", 1, 100),
      dependsOnIds: strings(raw.dependsOnIds, "depends_on_ids", 0, 100),
      status: raw.status,
    };
    if (!["unresolved", "resolved"].includes(anomaly.status)) {
      throw new Error("anomaly_dependency_invalid_status");
    }
    if (byId.has(anomaly.id)) {
      throw new Error("anomaly_dependency_duplicate_id");
    }
    byId.set(anomaly.id, anomaly);
  }
  for (const anomaly of byId.values()) {
    if (anomaly.dependsOnIds.some((id) => !byId.has(id) || id === anomaly.id)) {
      throw new Error("anomaly_dependency_unknown_dependency");
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("anomaly_dependency_cycle");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of byId.get(id)!.dependsOnIds) visit(parent);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);

  const children = new Map<string, string[]>();
  for (const anomaly of byId.values()) {
    for (const parent of anomaly.dependsOnIds) {
      children.set(parent, [...(children.get(parent) ?? []), anomaly.id]);
    }
  }
  const roots = [...byId.values()]
    .filter((anomaly) => anomaly.dependsOnIds.length === 0);

  return roots.map((root) => {
    const descendants: string[] = [];
    const stack = [...(children.get(root.id) ?? [])];
    while (stack.length) {
      const current = stack.pop()!;
      if (descendants.includes(current)) continue;
      descendants.push(current);
      stack.push(...(children.get(current) ?? []));
    }
    const allIds = [root.id, ...descendants];
    return {
      rootId: root.id,
      descendantIds: descendants.sort(),
      unresolvedDescendantIds: descendants
        .filter((id) => byId.get(id)!.status === "unresolved")
        .sort(),
      evidenceRefs: [
        ...new Set(allIds.flatMap((id) => byId.get(id)!.evidenceRefs)),
      ].sort(),
      note:
        "Dependent anomalies are not counted as independent signals merely because they are numerous.",
    } satisfies InvestigationAnomalyRoot;
  }).sort((a, b) =>
    b.descendantIds.length - a.descendantIds.length ||
    a.rootId.localeCompare(b.rootId));
}
