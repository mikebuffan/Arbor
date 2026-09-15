import { describe, expect, it } from "vitest";
import {
  findPatternHopTarget,
  patternTextSimilarity,
} from "@/lib/memory/patternMerge";

describe("pattern merge hopping", () => {
  it("prefers exact key matches", () => {
    const target = findPatternHopTarget({
      incomingKey: "interaction.pattern.agency_followthrough",
      incomingValue: { text: "keep going without repeated prompts" },
      rows: [
        {
          id: "exact",
          key: "interaction.pattern.agency_followthrough",
          value: { text: "continue obvious work without repeated prompts" },
          memory_kind: "pattern_candidate",
        },
        {
          id: "other",
          key: "interaction.pattern.keep_going",
          value: { text: "keep going without repeated prompts" },
          memory_kind: "pattern_candidate",
        },
      ],
    });

    expect(target?.id).toBe("exact");
  });

  it("hops to a strongly similar pattern candidate when keys differ", () => {
    const target = findPatternHopTarget({
      incomingKey: "interaction.pattern.keep_going",
      incomingValue: {
        text: "continue obvious safe work without repeated go prompts",
      },
      rows: [
        {
          id: "similar",
          key: "interaction.pattern.continue_work",
          value: {
            text: "continue obvious safe work without repeated go prompts",
          },
          memory_kind: "pattern_candidate",
        },
        {
          id: "unrelated",
          key: "interaction.pattern.voice",
          value: {
            text: "keep a natural general american voice",
          },
          memory_kind: "pattern_candidate",
        },
      ],
    });

    expect(target?.id).toBe("similar");
  });

  it("does not merge weak semantic overlap", () => {
    expect(
      patternTextSimilarity(
        "continue obvious safe work without repeated go prompts",
        "keep a natural general american voice",
      ),
    ).toBeLessThan(0.72);

    const target = findPatternHopTarget({
      incomingKey: "interaction.pattern.keep_going",
      incomingValue: {
        text: "continue obvious safe work without repeated go prompts",
      },
      rows: [
        {
          id: "voice",
          key: "interaction.pattern.voice",
          value: {
            text: "keep a natural general american voice",
          },
          memory_kind: "pattern_candidate",
        },
      ],
    });

    expect(target).toBeNull();
  });

  it("can merge a new candidate into an already promoted pattern", () => {
    const target = findPatternHopTarget({
      incomingKey: "interaction.pattern.agency_followthrough_v2",
      incomingValue: {
        text: "continue obvious safe work without repeated go prompts",
      },
      rows: [
        {
          id: "promoted",
          key: "interaction.pattern.agency_followthrough",
          value: {
            text: "continue obvious safe work without repeated go prompts",
          },
          memory_kind: "pattern",
        },
      ],
    });

    expect(target?.id).toBe("promoted");
  });
});
