export type InvestigationFrictionDimension =
  | "chronology"
  | "identity"
  | "ownership"
  | "source_lineage"
  | "financial"
  | "procedural"
  | "relationship"
  | "documentary_shadow"
  | "testimony"
  | "other";

export type InvestigationFrictionSignal = {
  id: string;
  entityIds: string[];
  dimension: InvestigationFrictionDimension;
  description: string;
  evidenceRefs: string[];
  lineageKeys: string[];
  occurredAt?: string | null;
  status: "unresolved" | "resolved";
};

export type InvestigationFrictionCluster = {
  entityId: string;
  unresolvedSignalIds: string[];
  dimensions: InvestigationFrictionDimension[];
  independentLineages: string[];
  evidenceRefs: string[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  status: "background_noise" | "friction_cluster";
  nextQuestions: string[];
  note:
    "Accumulated friction prioritizes investigation; it does not imply misconduct.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_friction_invalid_" + field);
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
    throw new Error("investigation_friction_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_friction_duplicate_" + field);
  }
  return out;
}

function timeRange(signals: InvestigationFrictionSignal[]) {
  const times = signals
    .map((signal) => signal.occurredAt ?? null)
    .filter((value): value is string => Boolean(value))
    .map(Date.parse)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    first: times.length ? new Date(times[0]).toISOString() : null,
    last: times.length ? new Date(times[times.length - 1]).toISOString() : null,
  };
}

function validateSignal(
  signal: InvestigationFrictionSignal,
): InvestigationFrictionSignal {
  const allowed: InvestigationFrictionDimension[] = [
    "chronology",
    "identity",
    "ownership",
    "source_lineage",
    "financial",
    "procedural",
    "relationship",
    "documentary_shadow",
    "testimony",
    "other",
  ];
  if (!allowed.includes(signal.dimension)) {
    throw new Error("investigation_friction_invalid_dimension");
  }
  if (!["unresolved", "resolved"].includes(signal.status)) {
    throw new Error("investigation_friction_invalid_status");
  }
  if (
    signal.occurredAt &&
    !Number.isFinite(Date.parse(signal.occurredAt))
  ) {
    throw new Error("investigation_friction_invalid_occurred_at");
  }
  return {
    ...signal,
    id: text(signal.id, "signal_id", 300),
    entityIds: strings(signal.entityIds, "entity_ids", 1, 30),
    description: text(signal.description, "description", 4000),
    evidenceRefs: strings(signal.evidenceRefs, "evidence_refs", 1, 100),
    lineageKeys: strings(signal.lineageKeys, "lineage_keys", 1, 100),
    occurredAt: signal.occurredAt ?? null,
  };
}

export function aggregateInvestigationFriction(input: {
  signals: InvestigationFrictionSignal[];
  minIndependentLineages?: number;
  minDimensions?: number;
}): InvestigationFrictionCluster[] {
  if (!Array.isArray(input.signals) || input.signals.length > 10_000) {
    throw new Error("investigation_friction_invalid_signals");
  }
  const minIndependentLineages = Math.max(
    2,
    Math.min(input.minIndependentLineages ?? 3, 10),
  );
  const minDimensions = Math.max(
    2,
    Math.min(input.minDimensions ?? 3, 10),
  );
  const signals = input.signals.map(validateSignal);

  const byEntity = new Map<string, InvestigationFrictionSignal[]>();
  for (const signal of signals) {
    for (const entityId of signal.entityIds) {
      byEntity.set(entityId, [
        ...(byEntity.get(entityId) ?? []),
        signal,
      ]);
    }
  }

  return [...byEntity.entries()]
    .map(([entityId, entitySignals]) => {
      const unresolved = entitySignals.filter(
        (signal) => signal.status === "unresolved",
      );
      const dimensions = [
        ...new Set(unresolved.map((signal) => signal.dimension)),
      ].sort() as InvestigationFrictionDimension[];
      const independentLineages = [
        ...new Set(unresolved.flatMap((signal) => signal.lineageKeys)),
      ].sort();
      const evidenceRefs = [
        ...new Set(unresolved.flatMap((signal) => signal.evidenceRefs)),
      ].sort();
      const range = timeRange(unresolved);
      const clustered =
        independentLineages.length >= minIndependentLineages &&
        dimensions.length >= minDimensions;

      return {
        entityId,
        unresolvedSignalIds: unresolved.map((signal) => signal.id).sort(),
        dimensions,
        independentLineages,
        evidenceRefs,
        firstObservedAt: range.first,
        lastObservedAt: range.last,
        status: clustered ? "friction_cluster" : "background_noise",
        nextQuestions: clustered
          ? [
              "Which unresolved dimensions share a common mechanism, if any?",
              "Can the cluster be reproduced from an independent starting node?",
              "Which signal disappears after identity resolution or primary-source review?",
              "What ordinary explanation accounts for the largest number of signals?",
            ]
          : [],
        note:
          "Accumulated friction prioritizes investigation; it does not imply misconduct.",
      } satisfies InvestigationFrictionCluster;
    })
    .sort((a, b) => {
      const clusterDelta =
        (b.status === "friction_cluster" ? 1 : 0) -
        (a.status === "friction_cluster" ? 1 : 0);
      if (clusterDelta) return clusterDelta;
      const dimensionDelta = b.dimensions.length - a.dimensions.length;
      if (dimensionDelta) return dimensionDelta;
      return b.independentLineages.length - a.independentLineages.length;
    });
}
