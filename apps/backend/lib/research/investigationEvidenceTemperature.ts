export type InvestigationEvidenceTemperatureInput = {
  evidenceRef: string;
  sourceClass:
    | "primary_record"
    | "direct_recording"
    | "sworn_firsthand"
    | "attributed_statement"
    | "media_summary"
    | "other";
  eventAt: string | null;
  sourceCreatedAt: string | null;
};

export type InvestigationEvidenceTemperature = {
  evidenceRef: string;
  sourceClass: InvestigationEvidenceTemperatureInput["sourceClass"];
  temporalBand:
    | "contemporaneous"
    | "near_contemporaneous"
    | "retrospective"
    | "undated";
  temporalDistanceMs: number | null;
  note:
    "Temporal distance describes when the source was created relative to the event; it is not a standalone truth or credibility score.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("evidence_temperature_invalid_" + field);
  }
  return value.trim();
}

function time(value: string | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error("evidence_temperature_invalid_timestamp");
  }
  return Date.parse(value);
}

export function labelEvidenceTemperature(
  input: InvestigationEvidenceTemperatureInput,
): InvestigationEvidenceTemperature {
  const classes = [
    "primary_record",
    "direct_recording",
    "sworn_firsthand",
    "attributed_statement",
    "media_summary",
    "other",
  ];
  if (!classes.includes(input.sourceClass)) {
    throw new Error("evidence_temperature_invalid_source_class");
  }
  const eventAt = time(input.eventAt);
  const sourceCreatedAt = time(input.sourceCreatedAt);
  let temporalBand: InvestigationEvidenceTemperature["temporalBand"];
  let temporalDistanceMs: number | null = null;

  if (eventAt === null || sourceCreatedAt === null) {
    temporalBand = "undated";
  } else {
    temporalDistanceMs = Math.abs(sourceCreatedAt - eventAt);
    if (temporalDistanceMs <= 24 * 60 * 60 * 1000) {
      temporalBand = "contemporaneous";
    } else if (temporalDistanceMs <= 30 * 24 * 60 * 60 * 1000) {
      temporalBand = "near_contemporaneous";
    } else {
      temporalBand = "retrospective";
    }
  }

  return {
    evidenceRef: text(input.evidenceRef, "evidence_ref", 1000),
    sourceClass: input.sourceClass,
    temporalBand,
    temporalDistanceMs,
    note:
      "Temporal distance describes when the source was created relative to the event; it is not a standalone truth or credibility score.",
  };
}
