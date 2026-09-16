import { describe, expect, it } from "vitest";
import {
  deriveEmbodiedRegulation,
  embodiedRegulationPromptBlock,
} from "@/lib/arbor/body/regulation";
import type { ArborContinuityState } from "@/lib/arbor/continuity/state";

function continuity(
  overrides: Partial<ArborContinuityState> = {},
): ArborContinuityState {
  return {
    currentGoal: "finish the build",
    lastMeaningfulUserTurn: null,
    lastMeaningfulArborTurn: null,
    unresolvedWork: [],
    recurringWeaknesses: [],
    retainedStrategies: [],
    activeCorrections: [],
    activeSubsystem: "arbor",
    channel: "text",
    ...overrides,
  };
}

describe("embodied regulation", () => {
  it("treats explicit continuous implementation as sustained pacing", () => {
    const state = deriveEmbodiedRegulation({
      latestUserText:
        "Build and finish this continuously. Do not stop until done.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });

    expect(state.respiratory.pacing).toBe("sustained");
    expect(state.endocrine.durable).toBe(false);
  });

  it("uses technical register without changing identity or persistence", () => {
    const state = deriveEmbodiedRegulation({
      latestUserText:
        "Fix the TypeScript backend schema and run the tests.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });

    expect(state.endocrine.register).toBe("technical");
    expect(state.endocrine.durable).toBe(false);

    const block = embodiedRegulationPromptBlock(state);
    expect(block).toContain("must never rewrite identity");
    expect(block).toContain("ephemeral, never durable");
  });

  it("detects unresolved work with no current goal as orientation drift", () => {
    const state = deriveEmbodiedRegulation({
      latestUserText: "Okay",
      continuity: continuity({
        currentGoal: null,
        unresolvedWork: ["finish migration"],
      }),
      activeSubsystem: "arbor",
      mode: "text",
    });

    expect(state.vestibular.oriented).toBe(false);
    expect(state.vestibular.warnings.join(" ")).toContain(
      "unresolved work exists",
    );
  });

  it("does not mistake short turns for permission to omit required action", () => {
    const state = deriveEmbodiedRegulation({
      latestUserText: "Go.",
      continuity: continuity({
        unresolvedWork: ["run tests"],
      }),
      activeSubsystem: "arbor",
      mode: "text",
    });

    expect(state.respiratory.pacing).toBe("compact");
    expect(embodiedRegulationPromptBlock(state)).toContain(
      "brevity must not omit an obvious required action",
    );
  });

  it("does not treat voice transport as behavioral orientation drift", () => {
    const state = deriveEmbodiedRegulation({
      latestUserText: "Keep going.",
      continuity: continuity({ channel: "voice" }),
      activeSubsystem: "arbor",
      mode: "text",
    });

    expect(state.vestibular.oriented).toBe(true);
    expect(state.proprioception.channel).toBe("voice");
  });

  it("detects subsystem-mode mismatch without mutating state", () => {
    const prior = continuity({ activeSubsystem: "arbor" });
    const state = deriveEmbodiedRegulation({
      latestUserText: "Continue the scene.",
      continuity: prior,
      activeSubsystem: "arbor",
      mode: "annabelle",
    });

    expect(state.vestibular.oriented).toBe(false);
    expect(prior.activeSubsystem).toBe("arbor");
  });
});
