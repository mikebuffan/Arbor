import { createHash } from "node:crypto";
import type { CanonicalChapterAcceptanceResult } from "./canonicalChapterAcceptance";

export type CompletedChapterReceipt = {
  chapterNumber: number;
  sourceSha256: string;
  acceptanceFingerprint: string;
};

export type ManuscriptContinuationState = {
  manuscriptId: string;
  manuscriptSha256: string;
  nextChapter: number;
  completed: CompletedChapterReceipt[];
  sequence: number;
};

export type ManuscriptContinuationResult = {
  state: ManuscriptContinuationState;
  duplicateSuppressed: boolean;
  completedChapter: boolean;
};

export function acceptanceFingerprint(result: CanonicalChapterAcceptanceResult): string {
  return createHash("sha256").update(JSON.stringify({
    chapterNumber: result.chapterNumber,
    sourceSha256: result.sourceSha256,
    passed: result.passed,
    blockers: result.blockers,
    watches: result.watches,
    notes: result.notes,
    protectedEditAllowed: result.protectedEditAllowed,
    recordSubjects: result.records.map(r => r.subject),
  })).digest("hex");
}

export function resumeManuscriptContinuation(input: {
  state: ManuscriptContinuationState;
  acceptance: CanonicalChapterAcceptanceResult;
  finalChapter?: number;
}): ManuscriptContinuationResult {
  const { state, acceptance } = input;
  const finalChapter = input.finalChapter ?? 60;
  if (state.manuscriptId !== acceptance.manuscriptId)
    throw new Error("annabelle_continuation_manuscript_mismatch");
  if (state.manuscriptSha256 !== acceptance.manuscriptSha256)
    throw new Error("annabelle_continuation_manuscript_hash_changed");
  if (state.nextChapter < 1 || state.nextChapter > finalChapter + 1)
    throw new Error("annabelle_continuation_invalid_next_chapter");

  const existing = state.completed.find(x => x.chapterNumber === acceptance.chapterNumber);
  if (existing) {
    if (existing.sourceSha256 !== acceptance.sourceSha256)
      throw new Error("annabelle_continuation_completed_source_changed");
    return { state, duplicateSuppressed: true, completedChapter: false };
  }

  if (acceptance.chapterNumber !== state.nextChapter)
    throw new Error("annabelle_continuation_out_of_sequence");

  const receipt: CompletedChapterReceipt = {
    chapterNumber: acceptance.chapterNumber,
    sourceSha256: acceptance.sourceSha256,
    acceptanceFingerprint: acceptanceFingerprint(acceptance),
  };
  const completed = [...state.completed, receipt].sort((a,b) => a.chapterNumber - b.chapterNumber);
  return {
    state: {
      ...state,
      nextChapter: Math.min(finalChapter + 1, acceptance.chapterNumber + 1),
      completed,
      sequence: state.sequence + 1,
    },
    duplicateSuppressed: false,
    completedChapter: true,
  };
}

export function initialManuscriptContinuationState(input: {
  manuscriptId: string;
  manuscriptSha256: string;
  nextChapter?: number;
  completed?: readonly CompletedChapterReceipt[];
}): ManuscriptContinuationState {
  return {
    manuscriptId: input.manuscriptId,
    manuscriptSha256: input.manuscriptSha256,
    nextChapter: input.nextChapter ?? 1,
    completed: [...(input.completed ?? [])],
    sequence: 0,
  };
}
