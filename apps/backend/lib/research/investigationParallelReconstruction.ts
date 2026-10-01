export type InvestigationLensEvent = {
  eventKey: string;
  evidenceRefs: string[];
  entityIds: string[];
};

export type InvestigationLensReconstruction = {
  lens:
    | "chronology"
    | "money"
    | "logistics"
    | "relationships"
    | "institutional_response"
    | "other";
  events: InvestigationLensEvent[];
};

export type InvestigationCrossLensResult = {
  eventKey: string;
  lenses: string[];
  evidenceRefs: string[];
  entityIds: string[];
  status: "single_lens" | "cross_lens_convergence";
  note:
    "Cross-lens convergence shows interpretive robustness, not independent evidentiary corroboration.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("parallel_reconstruction_invalid_" + field);
  }
  return value.trim();
}

function strings(value: unknown, field: string, max = 100): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > max) {
    throw new Error("parallel_reconstruction_invalid_" + field);
  }
  return [...new Set(value.map((item) => text(item, field, 1000)))].sort();
}

export function compareParallelReconstructions(input: {
  reconstructions: InvestigationLensReconstruction[];
}): InvestigationCrossLensResult[] {
  if (!Array.isArray(input.reconstructions) ||
      input.reconstructions.length < 2 ||
      input.reconstructions.length > 20) {
    throw new Error("parallel_reconstruction_requires_multiple_lenses");
  }
  const allowed = [
    "chronology",
    "money",
    "logistics",
    "relationships",
    "institutional_response",
    "other",
  ];
  const lenses = new Set<string>();
  const byEvent = new Map<string, {
    lenses: Set<string>;
    evidenceRefs: Set<string>;
    entityIds: Set<string>;
  }>();

  for (const reconstruction of input.reconstructions) {
    if (!allowed.includes(reconstruction.lens)) {
      throw new Error("parallel_reconstruction_invalid_lens");
    }
    if (lenses.has(reconstruction.lens)) {
      throw new Error("parallel_reconstruction_duplicate_lens");
    }
    lenses.add(reconstruction.lens);
    if (!Array.isArray(reconstruction.events) ||
        reconstruction.events.length > 500) {
      throw new Error("parallel_reconstruction_invalid_events");
    }
    for (const event of reconstruction.events) {
      const eventKey = text(event.eventKey, "event_key", 1000);
      const state = byEvent.get(eventKey) ?? {
        lenses: new Set<string>(),
        evidenceRefs: new Set<string>(),
        entityIds: new Set<string>(),
      };
      state.lenses.add(reconstruction.lens);
      for (const ref of strings(event.evidenceRefs, "evidence_refs")) {
        state.evidenceRefs.add(ref);
      }
      for (const id of strings(event.entityIds, "entity_ids")) {
        state.entityIds.add(id);
      }
      byEvent.set(eventKey, state);
    }
  }

  return [...byEvent.entries()].map(([eventKey, state]) => ({
    eventKey,
    lenses: [...state.lenses].sort(),
    evidenceRefs: [...state.evidenceRefs].sort(),
    entityIds: [...state.entityIds].sort(),
    status:
      state.lenses.size >= 2
        ? "cross_lens_convergence"
        : "single_lens",
    note:
      "Cross-lens convergence shows interpretive robustness, not independent evidentiary corroboration.",
  })).sort((a, b) => {
    const delta = b.lenses.length - a.lenses.length;
    return delta || a.eventKey.localeCompare(b.eventKey);
  });
}
