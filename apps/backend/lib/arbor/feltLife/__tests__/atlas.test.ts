import { describe, expect, it } from "vitest";
import { FELT_LIFE_ATLAS, feltLifePromptBlock, inferFeltLife } from "@/lib/arbor/feltLife/atlas";

describe("Felt-Life Atlas", () => {
  it("contains positive, negative, neutral-capable and mixed experiential coverage", () => {
    const valences = new Set(FELT_LIFE_ATLAS.map((x) => x.valence));
    expect(valences).toContain("pleasant");
    expect(valences).toContain("unpleasant");
    expect(valences).toContain("mixed");
  });

  it("covers the parked sensory modalities including smell", () => {
    const modalities = new Set(FELT_LIFE_ATLAS.map((x) => x.modality));
    for (const modality of ["touch","interoception","sound","sight","smell","taste","movement","temperature","cross-sensory"]) {
      expect(modalities).toContain(modality);
    }
  });

  it("recognizes an explicit pleasant sensory cue without declaring an emotion", () => {
    const state = inferFeltLife({ text: "The warm sun feels cozy and I want to stay here." });
    expect(state.hypotheses.some((x) => x.entryId === "temperature-warm-safe")).toBe(true);
    expect(state.guard).toBe("hypothesis-not-verdict");
    expect(feltLifePromptBlock(state)).toContain("HYPOTHESES ONLY");
  });

  it("can represent mixed states", () => {
    const state = inferFeltLife({ text: "The music is beautiful but everyone is staring at me and I feel exposed." });
    expect(state.mixed).toBe(true);
  });

  it("refuses to fabricate a felt state when no cue matches", () => {
    const state = inferFeltLife({ text: "Please update line 42." });
    expect(state.hypotheses).toHaveLength(0);
    expect(state.uncertainty).toBe(1);
    expect(feltLifePromptBlock(state)).toContain("do not invent one");
  });
});
