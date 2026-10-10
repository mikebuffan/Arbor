import { describe, expect, it } from "vitest";
import { createCorrection } from "../corrections";
import {
  mergeCorrections,
  mergeCorrectionSnapshots,
  normalizeCorrection,
  type ArborCorrection,
} from "../runtimeState";

function correction(id: string): ArborCorrection {
  return createCorrection({
    value: "Why did you stop? Keep going.",
    source: "text",
    observedAt: "2026-10-10T10:00:00.000Z",
    observationId: id,
  });
}
function ids(count: number, start = 0): string[] {
  return Array.from({ length: count }, (_, i) =>
    `message:owner:${String(i + start).padStart(4, "0")}`);
}
function snapshot(observationIds: string[], legacyOccurrences = 0): ArborCorrection {
  return {
    ...correction("message:owner:dummy"),
    observationIds,
    legacyOccurrences,
    occurrences: legacyOccurrences + observationIds.length,
  };
}

describe("B11/C08 high-volume correction observation safety", () => {
  it("permits the stated maximum 128 distinct IDs without inventing new observations", () => {
    const exactlyFull = snapshot(ids(128));
    expect(normalizeCorrection(exactlyFull).observationIds).toHaveLength(128);
    const replay = correction(ids(128)[0]);
    expect(mergeCorrections([exactlyFull], [replay])[0]).toMatchObject({
      occurrences: 128,
      legacyOccurrences: 0,
    });
    expect(mergeCorrectionSnapshots([[exactlyFull], [exactlyFull]])[0].occurrences).toBe(128);
  });

  it("refuses the 129th ID instead of truncating provenance and risking false replay counts", () => {
    const full = snapshot(ids(128));
    const next = correction("message:owner:0128");
    const original = JSON.stringify(full);
    expect(() => mergeCorrections([full], [next]))
      .toThrow("arbor_correction_observation_limit");
    expect(() => mergeCorrectionSnapshots([[full], [next]]))
      .toThrow("arbor_correction_observation_limit");
    expect(JSON.stringify(full)).toBe(original);
  });

  it.each([NaN, Infinity, -Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "does not store legacy occurrence count %s as valid feedback", (occurrences) => {
      const bad = { ...correction("message:owner:dummy"), occurrences };
      delete bad.observationIds;
      delete bad.legacyOccurrences;
      expect(() => normalizeCorrection(bad))
        .toThrow("arbor_correction_invalid_occurrences");
      expect(() => mergeCorrections([], [bad]))
        .toThrow("arbor_correction_invalid_occurrences");
      expect(() => mergeCorrectionSnapshots([[bad]]))
        .toThrow("arbor_correction_invalid_occurrences");
    },
  );

  it("does not overflow a huge legacy baseline when a new identified event arrives", () => {
    const legacy = { ...correction("message:owner:dummy"), occurrences: Number.MAX_SAFE_INTEGER };
    delete legacy.observationIds;
    delete legacy.legacyOccurrences;
    expect(() => mergeCorrections([legacy], [correction("message:owner:new")]))
      .toThrow("arbor_correction_occurrence_overflow");
  });

  it("refuses a known-ID union that would exceed safe integer counters", () => {
    const large = snapshot(["message:owner:1000", "message:owner:1001"],
      Number.MAX_SAFE_INTEGER - 2);
    expect(() => mergeCorrections([large], [correction("message:owner:1002")]))
      .toThrow("arbor_correction_occurrence_overflow");
  });

  it("rejects a persisted keyed snapshot where known IDs exceed the fixed limit", () => {
    expect(() => normalizeCorrection(snapshot(ids(129))))
      .toThrow("arbor_correction_invalid_observation_ids");
  });
});
