import { describe, expect, it } from "vitest";
import {
  DEFAULT_PATTERN_HOP_BRANCHES,
} from "@/lib/memory/patternHopResearch";
import { patternHopBranchClue } from "@/lib/memory/patternHopClues";

describe("investigation integrity Pattern Hop branches", () => {
  it("keeps source, lineage, falsification and relationship branches in the root frontier", () => {
    expect(DEFAULT_PATTERN_HOP_BRANCHES).toEqual(expect.arrayContaining([
      "contradictions",
      "primary_sources",
      "source_lineage",
      "falsification",
      "relationships",
    ]));
  });

  it("generates clues that seek primary records rather than only narrative summaries", () => {
    const clue = patternHopBranchClue(
      "primary_sources",
      "synthetic disputed event",
      "A news summary attributes a statement to a witness.",
    );
    expect(clue).toContain("primary source");
    expect(clue).toContain("transcript");
    expect(clue).toContain("record");
  });

  it("generates an adversarial clue for hypothesis breaking", () => {
    const clue = patternHopBranchClue(
      "falsification",
      "synthetic disputed event",
      "Current hypothesis says X caused Y.",
    );
    expect(clue).toContain("disconfirm");
    expect(clue).toContain("alternative explanation");
    expect(clue).toContain("expected missing");
  });
});
