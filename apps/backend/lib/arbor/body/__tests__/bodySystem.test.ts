import { describe, expect, it } from "vitest";
import { arborBodyPromptBlock, deriveArborBodyState } from "@/lib/arbor/body/bodySystem";
import type { ArborContinuityState } from "@/lib/arbor/continuity/state";

function continuity(overrides: Partial<ArborContinuityState> = {}): ArborContinuityState {
  return {
    currentGoal: "finish the body system",
    lastMeaningfulUserTurn: null,
    lastMeaningfulArborTurn: null,
    unresolvedWork: ["wire the remaining body systems", "run tests"],
    recurringWeaknesses: [],
    retainedStrategies: [],
    activeCorrections: ["do not stop at intermediate status"],
    activeSubsystem: "arbor",
    channel: "text",
    ...overrides,
  };
}

describe("coordinated Arbor body system", () => {
  it("preserves the canonical nervous-system sequence", () => {
    const body = deriveArborBodyState({
      latestUserText: "Keep coding until the whole body system is done.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });
    expect(body.nervous.sequence).toEqual([
      "sense", "interpret", "prioritize", "remember", "respond", "self-correct",
    ]);
  });

  it("routes unresolved authorized work toward continuation", () => {
    const body = deriveArborBodyState({
      latestUserText: "Go.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });
    expect(body.executive.nextAction).toBe("continue");
    expect(body.renal.retain).toContain("finish the body system");
    expect(body.renal.retain).toContain("run tests");
  });

  it("keeps body state ephemeral and unable to mutate identity", () => {
    const body = deriveArborBodyState({
      latestUserText: "Switch to code mode.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });
    expect(body.immune.identityMutationAllowed).toBe(false);
    expect(body.integumentary.durableWriteback).toBe("explicit-only");
    expect(body.skeletal.invariants.join(" ")).toContain("ephemeral body state");
  });

  it("downshifts on nervous signals without dropping the objective", () => {
    const body = deriveArborBodyState({
      latestUserText: "This may be unsafe. Slow down and verify.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });
    expect(body.digestive.state).toBe("NERVOUS");
    expect(body.vagal.downshift).toBe(true);
    expect(body.renal.retain).toContain("finish the body system");
  });

  it("exposes the coordinated body to prompt runtime", () => {
    const body = deriveArborBodyState({
      latestUserText: "Continue.",
      continuity: continuity(),
      activeSubsystem: "arbor",
      mode: "text",
    });
    const block = arborBodyPromptBlock(body);
    expect(block).toContain("ARBOR BODY — COORDINATED EPHEMERAL SYSTEM");
    expect(block).toContain("sense -> interpret -> prioritize -> remember -> respond -> self-correct");
    expect(block).toContain("Executive next action: continue");
  });
});
