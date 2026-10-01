import { describe, expect, it } from "vitest";
import {
  assertEditorialRecord,
  canRewriteFromDiagnostic,
  downstreamImpactChapters,
  type EditorialRecord,
} from "./annabelleEditorial.js";

const base: EditorialRecord = {
  type: "voice_evidence",
  content: { evidenceCount: 1 },
  confidence: 0.8,
  epistemicStatus: "observed",
  source: { manuscriptId: "m1", chapterNumber: 1, sourceSha256: "abc" },
};

describe("Annabelle editorial invariants", () => {
  it("does not promote a one-off voice observation to confirmed", () => {
    expect(() => assertEditorialRecord({
      ...base,
      epistemicStatus: "confirmed",
    })).toThrow("annabelle_voice_confirmation_requires_repeated_evidence");
  });

  it("permits confirmed voice only after repeated evidence", () => {
    expect(() => assertEditorialRecord({
      ...base,
      content: { evidenceCount: 2 },
      epistemicStatus: "confirmed",
    })).not.toThrow();
  });

  it("requires diagnosis plus provenance before rewrite", () => {
    expect(canRewriteFromDiagnostic([base])).toBe(false);
    expect(canRewriteFromDiagnostic([
      base,
      { ...base, type: "problem" },
    ])).toBe(true);
  });

  it("marks all later chapters for downstream review", () => {
    expect(downstreamImpactChapters(58, 60)).toEqual([59, 60]);
  });
});
