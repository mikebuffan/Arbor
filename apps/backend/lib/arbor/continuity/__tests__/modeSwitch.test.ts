import { describe, expect, it } from "vitest";
import { enterAnnabelle, returnToArborVoice } from "../modeSwitch";
import type { ArborContinuityState } from "../state";

describe("Arbor authority-mode switching", () => {
  it("changes authority without resetting continuity", () => {
    const state: ArborContinuityState = {
      currentGoal: "Finish the book",
      lastMeaningfulUserTurn: "Annabelle, kitchen's yours",
      lastMeaningfulArborTurn: "Kitchen's hers.",
      unresolvedWork: [
        {
          id: "w1",
          title: "Threesome scene",
          status: "open",
          nextAction: "continue draft",
        },
      ],
      activeCorrections: [
        "Will gives a look instead of calling Hannibal over",
      ],
      mode: "text",
    };

    const annabelle = enterAnnabelle(state);
    const returned = returnToArborVoice(annabelle);

    expect(returned.mode).toBe("voice");
    expect(returned.currentGoal).toBe(state.currentGoal);
    expect(returned.unresolvedWork).toEqual(state.unresolvedWork);
    expect(returned.activeCorrections).toEqual(state.activeCorrections);
  });
});
