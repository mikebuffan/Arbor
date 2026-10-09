import { describe, expect, it } from "vitest";
import { initialManuscriptContinuationState, resumeManuscriptContinuation } from "../manuscriptContinuation";
import type { CanonicalChapterAcceptanceResult } from "../canonicalChapterAcceptance";

const acceptance = (chapterNumber: number, sourceSha256 = "b".repeat(64)): CanonicalChapterAcceptanceResult => ({
  chapterNumber,
  sourceSha256,
  passed: true,
  blockers: 0,
  watches: 1,
  notes: 0,
  protectedEditAllowed: true,
  protectedViolations: [],
  protectedPrinciples: [],
  records: [],
  manuscriptId: "ever-after",
  manuscriptSha256: "a".repeat(64),
  sourceKind: "canonical-manuscript",
  sourceLocator: { format: "pdf", startPage: 99, endPage: 184 },
  exactSourceHashVerified: true,
});

describe("Annabelle manuscript continuation", () => {
  it.each([
    { passed: false }, { blockers: 1 }, { protectedEditAllowed: false },
    { exactSourceHashVerified: false }, { sourceKind: "fixture" },
  ])("does not mark failed or unverified chapter acceptance complete", changes => {
    const state = initialManuscriptContinuationState({ manuscriptId: "ever-after", manuscriptSha256: "a".repeat(64), nextChapter: 2 });
    expect(() => resumeManuscriptContinuation({ state, acceptance: { ...acceptance(2), ...changes } as CanonicalChapterAcceptanceResult }))
      .toThrow("annabelle_continuation_acceptance_not_passed");
    expect(state.completed).toEqual([]);
    expect(state.nextChapter).toBe(2);
  });

  it("rejects an altered same-source acceptance instead of calling it a replay", () => {
    const state = initialManuscriptContinuationState({ manuscriptId: "ever-after", manuscriptSha256: "a".repeat(64), nextChapter: 2 });
    const first = resumeManuscriptContinuation({ state, acceptance: acceptance(2) });
    expect(() => resumeManuscriptContinuation({ state: first.state, acceptance: { ...acceptance(2), watches: 2 } }))
      .toThrow("annabelle_continuation_completed_acceptance_changed");
  });

  it("does not invent chapter 61 after the final chapter", () => {
    const state = initialManuscriptContinuationState({ manuscriptId: "ever-after", manuscriptSha256: "a".repeat(64), nextChapter: 61 });
    expect(() => resumeManuscriptContinuation({ state, acceptance: acceptance(61) }))
      .toThrow("annabelle_continuation_invalid_chapter");
  });

  it.each([{ nextChapter: 2.5 }, { sequence: NaN }])("rejects corrupted continuation positions", changes => {
    const state = { ...initialManuscriptContinuationState({ manuscriptId: "ever-after", manuscriptSha256: "a".repeat(64), nextChapter: 2 }), ...changes };
    expect(() => resumeManuscriptContinuation({ state, acceptance: acceptance(2) })).toThrow("annabelle_continuation_invalid_");
  });
  it("advances exactly once and suppresses a replay", () => {
    const start = initialManuscriptContinuationState({
      manuscriptId: "ever-after",
      manuscriptSha256: "a".repeat(64),
      nextChapter: 2,
    });
    const first = resumeManuscriptContinuation({ state: start, acceptance: acceptance(2) });
    expect(first.state.nextChapter).toBe(3);
    expect(first.completedChapter).toBe(true);
    const replay = resumeManuscriptContinuation({ state: first.state, acceptance: acceptance(2) });
    expect(replay.duplicateSuppressed).toBe(true);
    expect(replay.state.sequence).toBe(first.state.sequence);
  });

  it("refuses to skip the durable next chapter", () => {
    const start = initialManuscriptContinuationState({
      manuscriptId: "ever-after",
      manuscriptSha256: "a".repeat(64),
      nextChapter: 2,
    });
    expect(() => resumeManuscriptContinuation({ state: start, acceptance: acceptance(3) }))
      .toThrow("annabelle_continuation_out_of_sequence");
  });

  it("refuses a changed source for an already completed chapter", () => {
    const start = initialManuscriptContinuationState({
      manuscriptId: "ever-after",
      manuscriptSha256: "a".repeat(64),
      nextChapter: 2,
    });
    const first = resumeManuscriptContinuation({ state: start, acceptance: acceptance(2) });
    expect(() => resumeManuscriptContinuation({
      state: first.state,
      acceptance: acceptance(2, "c".repeat(64)),
    })).toThrow("annabelle_continuation_completed_source_changed");
  });
});
