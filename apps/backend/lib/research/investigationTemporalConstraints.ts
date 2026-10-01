export type InvestigationTimeWindow = {
  id: string;
  earliestAt: string;
  latestAt: string;
  evidenceRefs: string[];
};

export type InvestigationTemporalConstraint = {
  id: string;
  fromWindowId: string;
  toWindowId: string;
  minimumGapMs: number;
  rationale: string;
  evidenceRefs: string[];
};

export type InvestigationTemporalConstraintResult = {
  constraintId: string;
  fromWindowId: string;
  toWindowId: string;
  maximumPossibleGapMs: number;
  requiredMinimumGapMs: number;
  status: "feasible" | "hard_conflict";
  evidenceRefs: string[];
  note:
    "A hard timeline conflict identifies incompatible documented bounds; it does not identify why the conflict exists.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("temporal_constraint_invalid_" + field);
  }
  return value.trim();
}

function iso(value: unknown, field: string): string {
  const raw = text(value, field, 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("temporal_constraint_invalid_" + field);
  }
  return raw;
}

function refs(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new Error("temporal_constraint_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  return [...new Set(out)];
}

function validateWindow(
  value: InvestigationTimeWindow,
): InvestigationTimeWindow {
  const earliestAt = iso(value.earliestAt, "earliest_at");
  const latestAt = iso(value.latestAt, "latest_at");
  if (Date.parse(earliestAt) > Date.parse(latestAt)) {
    throw new Error("temporal_constraint_reversed_window");
  }
  return {
    id: text(value.id, "window_id", 300),
    earliestAt,
    latestAt,
    evidenceRefs: refs(value.evidenceRefs, "window_evidence_refs"),
  };
}

export function evaluateTemporalConstraints(input: {
  windows: InvestigationTimeWindow[];
  constraints: InvestigationTemporalConstraint[];
}): InvestigationTemporalConstraintResult[] {
  if (!Array.isArray(input.windows) ||
      input.windows.length < 1 ||
      input.windows.length > 10_000) {
    throw new Error("temporal_constraint_invalid_windows");
  }
  if (!Array.isArray(input.constraints) ||
      input.constraints.length > 10_000) {
    throw new Error("temporal_constraint_invalid_constraints");
  }

  const windows = input.windows.map(validateWindow);
  const byId = new Map(windows.map((window) => [window.id, window]));
  if (byId.size !== windows.length) {
    throw new Error("temporal_constraint_duplicate_window_id");
  }

  return input.constraints.map((constraint) => {
    const id = text(constraint.id, "constraint_id", 300);
    const fromWindowId = text(
      constraint.fromWindowId,
      "from_window_id",
      300,
    );
    const toWindowId = text(constraint.toWindowId, "to_window_id", 300);
    const from = byId.get(fromWindowId);
    const to = byId.get(toWindowId);
    if (!from || !to || fromWindowId === toWindowId) {
      throw new Error("temporal_constraint_unknown_window");
    }
    if (!Number.isSafeInteger(constraint.minimumGapMs) ||
        constraint.minimumGapMs < 0 ||
        constraint.minimumGapMs > 365 * 24 * 60 * 60 * 1000) {
      throw new Error("temporal_constraint_invalid_minimum_gap");
    }
    text(constraint.rationale, "rationale", 4000);
    const evidenceRefs = [
      ...new Set([
        ...from.evidenceRefs,
        ...to.evidenceRefs,
        ...refs(constraint.evidenceRefs, "constraint_evidence_refs"),
      ]),
    ].sort();

    const maximumPossibleGapMs =
      Date.parse(to.latestAt) - Date.parse(from.earliestAt);
    const status =
      maximumPossibleGapMs < constraint.minimumGapMs
        ? "hard_conflict"
        : "feasible";

    return {
      constraintId: id,
      fromWindowId,
      toWindowId,
      maximumPossibleGapMs,
      requiredMinimumGapMs: constraint.minimumGapMs,
      status,
      evidenceRefs,
      note:
        "A hard timeline conflict identifies incompatible documented bounds; it does not identify why the conflict exists.",
    };
  });
}
