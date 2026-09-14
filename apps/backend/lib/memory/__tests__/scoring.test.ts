import { describe, expect, it } from "vitest";
import { hybridMemoryScore, rerankMemoryItems } from "@/lib/memory/scoring";

describe("memory hybrid reranking", () => {
  it("lets semantic relevance lead while preserving durable importance", () => {
    const relevant = {
      key: "relevant",
      similarity: 0.92,
      importance: 6,
      confidence: 0.9,
      last_seen_at: new Date().toISOString(),
    };
    const importantButIrrelevant = {
      key: "important",
      similarity: 0.15,
      importance: 10,
      confidence: 1,
      last_seen_at: new Date().toISOString(),
    };

    expect(hybridMemoryScore(relevant)).toBeGreaterThan(
      hybridMemoryScore(importantButIrrelevant),
    );
    expect(rerankMemoryItems([importantButIrrelevant, relevant], 1)[0].key).toBe(
      "relevant",
    );
  });
});
