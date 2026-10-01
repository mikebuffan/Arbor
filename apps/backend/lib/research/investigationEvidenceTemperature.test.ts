import { describe, expect, it } from "vitest";
import { labelEvidenceTemperature } from "./investigationEvidenceTemperature";

describe("evidence temporal-distance labels", () => {
  it("labels same-day records contemporaneous", () => {
    const result = labelEvidenceTemperature({
      evidenceRef: "record:1",
      sourceClass: "primary_record",
      eventAt: "2026-01-01T10:00:00Z",
      sourceCreatedAt: "2026-01-01T15:00:00Z",
    });

    expect(result.temporalBand).toBe("contemporaneous");
    expect(result.note).toContain("not a standalone truth or credibility score");
  });

  it("labels years-later recollection retrospective without deciding it is false", () => {
    const result = labelEvidenceTemperature({
      evidenceRef: "testimony:1",
      sourceClass: "sworn_firsthand",
      eventAt: "2000-01-01T00:00:00Z",
      sourceCreatedAt: "2020-01-01T00:00:00Z",
    });

    expect(result.temporalBand).toBe("retrospective");
  });

  it("keeps undated evidence explicitly undated", () => {
    const result = labelEvidenceTemperature({
      evidenceRef: "record:undated",
      sourceClass: "other",
      eventAt: null,
      sourceCreatedAt: "2026-01-01T00:00:00Z",
    });

    expect(result.temporalBand).toBe("undated");
    expect(result.temporalDistanceMs).toBeNull();
  });
});
