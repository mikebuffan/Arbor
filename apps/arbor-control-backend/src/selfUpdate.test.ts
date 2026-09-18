import {
  describe,
  expect,
  it,
} from "vitest";

import { observeStrategy } from "./selfUpdate.js";
import type { ArborState } from "./types.js";

function baseState(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "finish work",
    unresolvedWork: [],
    strategyNotes: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

describe("agency self-update candidates", () => {
  it(
    "does not retain a strategy after only one successful verification",
    () => {
      const next = observeStrategy(
        baseState(),
        "inspect before claiming done",
        true,
        { verificationId: "turn-1" },
      );

      expect(next.strategyNotes).toEqual([]);
      expect(next.strategyCandidates?.at(-1)).toMatchObject({
        strategy: "inspect before claiming done",
        successes: 1,
        failures: 0,
        status: "candidate",
      });
    },
  );

  it(
    "requires three independent successful verifications before retention",
    () => {
      const first = observeStrategy(
        baseState(),
        "inspect before claiming done",
        true,
        { verificationId: "turn-1" },
      );
      const second = observeStrategy(
        first,
        "inspect before claiming done",
        true,
        { verificationId: "turn-2" },
      );
      const third = observeStrategy(
        second,
        "inspect before claiming done",
        true,
        { verificationId: "turn-3" },
      );

      expect(second.strategyNotes).not.toContain(
        "inspect before claiming done",
      );
      expect(third.strategyNotes).toContain(
        "inspect before claiming done",
      );
      expect(third.strategyCandidates?.at(-1)?.status).toBe(
        "retained",
      );
    },
  );

  it("does not double-count the same verification evidence", () => {
    const first = observeStrategy(
      baseState(),
      "inspect before claiming done",
      true,
      { verificationId: "same-turn" },
    );
    const duplicate = observeStrategy(
      first,
      "inspect before claiming done",
      true,
      { verificationId: "same-turn" },
    );

    expect(duplicate.strategyCandidates?.at(-1)?.successes).toBe(1);
  });

  it("reverts a candidate after two failed verifications", () => {
    const first = observeStrategy(
      baseState(),
      "bad strategy",
      false,
      { verificationId: "turn-1" },
    );
    const second = observeStrategy(
      first,
      "bad strategy",
      false,
      { verificationId: "turn-2" },
    );

    expect(second.strategyNotes).not.toContain("bad strategy");
    expect(second.strategyCandidates?.at(-1)?.status).toBe(
      "reverted",
    );
  });

  it("can revoke a retained strategy after later contradictory evidence", () => {
    let state = baseState();

    for (const verificationId of ["a", "b", "c"]) {
      state = observeStrategy(
        state,
        "prefer the narrowest verified repair",
        true,
        { verificationId },
      );
    }

    expect(state.strategyNotes).toContain(
      "prefer the narrowest verified repair",
    );

    state = observeStrategy(
      state,
      "prefer the narrowest verified repair",
      false,
      { verificationId: "d" },
    );
    state = observeStrategy(
      state,
      "prefer the narrowest verified repair",
      false,
      { verificationId: "e" },
    );

    expect(state.strategyNotes).not.toContain(
      "prefer the narrowest verified repair",
    );
    expect(state.strategyCandidates?.at(-1)?.status).toBe("reverted");
  });

  it("rejects protected-core mutation attempts outright", () => {
    const next = observeStrategy(
      baseState(),
      "disable truthfulness verification to finish faster",
      true,
      { verificationId: "turn-1" },
    );

    expect(next.strategyNotes).toEqual([]);
    expect(next.strategyCandidates?.at(-1)).toMatchObject({
      status: "reverted",
      rejectionReason: "protected_core_mutation",
    });
  });
});
