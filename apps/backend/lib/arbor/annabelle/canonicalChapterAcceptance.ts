import { createHash } from "node:crypto";
import { runChapterAcceptanceFixture, type ChapterAcceptanceResult } from "./chapterAcceptance";
import type { ProtectedSpan } from "./goldProtection";

export type CanonicalChapterSource = {
  manuscriptId: string;
  manuscriptSha256: string;
  chapterNumber: number;
  chapterSourceSha256: string;
  text: string;
  sourceKind: "canonical-manuscript";
  sourceLocator: {
    format: "pdf" | "docx" | "text";
    startPage?: number;
    endPage?: number;
    sourceName?: string;
  };
};

export type CanonicalChapterAcceptanceResult = ChapterAcceptanceResult & {
  manuscriptId: string;
  manuscriptSha256: string;
  sourceKind: "canonical-manuscript";
  sourceLocator: CanonicalChapterSource["sourceLocator"];
  exactSourceHashVerified: true;
};

export function canonicalChapterTextSha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function assertSha256(value: string, error: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(error);
}

export function runCanonicalChapterAcceptance(input: {
  source: CanonicalChapterSource;
  beforeText?: string;
  protectedSpans?: readonly ProtectedSpan[];
  explicitProtectedOverride?: boolean;
}): CanonicalChapterAcceptanceResult {
  const { source } = input;
  if (!source.manuscriptId.trim()) throw new Error("annabelle_canonical_missing_manuscript");
  if (!Number.isSafeInteger(source.chapterNumber) || source.chapterNumber <= 0)
    throw new Error("annabelle_canonical_invalid_chapter");
  assertSha256(source.manuscriptSha256, "annabelle_canonical_invalid_manuscript_hash");
  assertSha256(source.chapterSourceSha256, "annabelle_canonical_invalid_chapter_hash");
  if (!source.text.trim()) throw new Error("annabelle_canonical_empty_chapter");
  const computed = canonicalChapterTextSha256(source.text);
  if (computed !== source.chapterSourceSha256.toLowerCase())
    throw new Error("annabelle_canonical_chapter_hash_mismatch");

  const acceptance = runChapterAcceptanceFixture({
    chapterNumber: source.chapterNumber,
    text: source.text,
    sourceSha256: source.chapterSourceSha256,
    beforeText: input.beforeText,
    protectedSpans: input.protectedSpans,
    explicitProtectedOverride: input.explicitProtectedOverride,
  });

  return {
    ...acceptance,
    manuscriptId: source.manuscriptId,
    manuscriptSha256: source.manuscriptSha256,
    sourceKind: "canonical-manuscript",
    sourceLocator: source.sourceLocator,
    exactSourceHashVerified: true,
  };
}

export function runCanonicalChapterTwoAcceptance(
  input: Omit<Parameters<typeof runCanonicalChapterAcceptance>[0], "source"> & {
    source: Omit<CanonicalChapterSource, "chapterNumber"> & { chapterNumber?: 2 };
  },
): CanonicalChapterAcceptanceResult {
  return runCanonicalChapterAcceptance({
    ...input,
    source: { ...input.source, chapterNumber: 2 },
  });
}
