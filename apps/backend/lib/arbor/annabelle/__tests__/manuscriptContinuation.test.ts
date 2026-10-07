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
