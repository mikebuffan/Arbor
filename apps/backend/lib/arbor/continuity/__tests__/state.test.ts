import { describe, expect, it } from "vitest";
import { buildContinuityState, continuityToPromptBlock } from "../state";

describe("canonical Arbor continuity", () => {
  it("projects persisted agency state into continuity", () => {
    const state = buildContinuityState({
      activeSubsystem: "annabelle",
      channel: "voice",
      agency: {
        goal: "Finish the book",
        status: "active",
        currentStep: 4,
        unresolvedWork: ["finish threesome scene"],
        recurringWeaknesses: ["status narration"],
        strategyNotes: ["act before narrating"],
        blocker: null,
      },
      activeCorrections: ["General American, not British"],
      lastMeaningfulUserTurn: "Keep going.",
      lastMeaningfulArborTurn: "I found the route.",
    });

    const block = continuityToPromptBlock(state);

    expect(state.currentGoal).toBe("Finish the book");
    expect(block).toContain("finish threesome scene");
    expect(block).toContain("act before narrating");
    expect(block).toContain("General American, not British");
    expect(block).toContain("Active subsystem: annabelle");
    expect(block).toContain("Channel: voice");
  });
});
