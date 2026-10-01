export type InvestigationFunctionalGap = {
  id: string;
  upstreamEntityIds: string[];
  downstreamEntityIds: string[];
  observedTransition: string;
  requiredCapabilities: string[];
  evidenceRefs: string[];
  lineageKeys: string[];
};

export type InvestigationMissingFunctionLead = {
  id: string;
  placeholderNodeId: string;
  functionalRole: string;
  requiredCapabilities: string[];
  upstreamEntityIds: string[];
  downstreamEntityIds: string[];
  evidenceRefs: string[];
  independentLineages: string[];
  searchTargets: string[];
  status: "unknown_function_hypothesis";
  note:
    "The system infers a missing function only; it does not invent or identify a person.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("missing_function_invalid_" + field);
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
    throw new Error("missing_function_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  return [...new Set(out)];
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 80) || "gap";
}

export function inferMissingFunction(
  gap: InvestigationFunctionalGap,
): InvestigationMissingFunctionLead {
  const id = text(gap.id, "gap_id", 300);
  const upstreamEntityIds = strings(
    gap.upstreamEntityIds,
    "upstream_entity_ids",
    1,
    50,
  );
  const downstreamEntityIds = strings(
    gap.downstreamEntityIds,
    "downstream_entity_ids",
    1,
    50,
  );
  const observedTransition = text(
    gap.observedTransition,
    "observed_transition",
    4000,
  );
  const requiredCapabilities = strings(
    gap.requiredCapabilities,
    "required_capabilities",
    1,
    30,
  );
  const evidenceRefs = strings(gap.evidenceRefs, "evidence_refs", 1, 100);
  const independentLineages = strings(
    gap.lineageKeys,
    "lineage_keys",
    1,
    100,
  ).sort();

  const functionalRole =
    "Unknown function capable of " +
    requiredCapabilities.join(", ") +
    " between the documented upstream and downstream records.";

  return {
    id: "missing-function-" + slug(id),
    placeholderNodeId: "UNKNOWN_FUNCTION_" + slug(id).toUpperCase(),
    functionalRole,
    requiredCapabilities,
    upstreamEntityIds,
    downstreamEntityIds,
    evidenceRefs,
    independentLineages,
    searchTargets: [
      "Primary records showing who or what performed: " +
        requiredCapabilities.join(", "),
      "Administrative/logistical records explaining transition: " +
        observedTransition,
      "Evidence that no intermediary was required because the transition was direct or automated.",
    ],
    status: "unknown_function_hypothesis",
    note:
      "The system infers a missing function only; it does not invent or identify a person.",
  };
}
