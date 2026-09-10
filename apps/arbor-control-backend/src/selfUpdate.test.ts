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
    "retains a strategy after two successful verifications and no failures",
    () => {
      const first = observeStrategy(
        baseState(),
        "inspect before claiming done",
        true,
      );
      const second = observeStrategy(
        first,
        "inspect before claiming done",
        true,
      );

      expect(second.strategyNotes).toContain(
        "inspect before claiming done",
      );
      expect(second.strategyCandidates?.at(-1)?.status).toBe(
        "retained",
      );
    },
  );

  it("reverts a candidate after two failed verifications", () => {
    const first = observeStrategy(
      baseState(),
      "bad strategy",
      false,
    );
    const second = observeStrategy(
      first,
      "bad strategy",
      false,
    );

    expect(second.strategyNotes).not.toContain("bad strategy");
    expect(second.strategyCandidates?.at(-1)?.status).toBe(
      "reverted",
    );
  });
});
