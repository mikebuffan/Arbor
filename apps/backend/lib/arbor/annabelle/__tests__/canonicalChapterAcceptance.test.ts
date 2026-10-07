import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runCanonicalChapterTwoAcceptance } from "../canonicalChapterAcceptance";

describe("canonical chapter acceptance", () => {
  const text = "Rain moved against the window. Ever opened her eyes. She chose the navy jacket.";
  const chapterSourceSha256 = createHash("sha256").update(text).digest("hex");
  const source = {
    manuscriptId: "ever-after",
    manuscriptSha256: "a".repeat(64),
    chapterSourceSha256,
    text,
    sourceKind: "canonical-manuscript" as const,
    sourceLocator: { format: "pdf" as const, startPage: 99, endPage: 184, sourceName: "ever-after-STANDARD.pdf" },
  };

  it("accepts exact source text and binds Chapter Two", () => {
    const result = runCanonicalChapterTwoAcceptance({ source });
    expect(result.chapterNumber).toBe(2);
    expect(result.exactSourceHashVerified).toBe(true);
    expect(result.sourceSha256).toBe(chapterSourceSha256);
  });

  it("rejects source drift", () => {
    expect(() => runCanonicalChapterTwoAcceptance({
      source: { ...source, text: source.text + " changed" },
    })).toThrow("annabelle_canonical_chapter_hash_mismatch");
  });
});
