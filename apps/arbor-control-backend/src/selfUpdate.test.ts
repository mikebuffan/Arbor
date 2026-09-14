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
    "retains a legacy strategy after two successful verifications when provenance is unavailable",
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

  it(
    "does not multiply two confirmations from the same original turn",
    () => {
      const first = observeStrategy(
        baseState(),
        "inspect before claiming done",
        true,
        {
          sourceId: "turn-1:verification",
          originId: "turn-1",
          occurredAt: "2026-09-14T20:00:00.000Z",
        },
      );

      const second = observeStrategy(
        first,
        "inspect before claiming done",
        true,
        {
          sourceId: "turn-1:confirmation",
          originId: "turn-1",
          occurredAt: "2026-09-14T20:00:01.000Z",
        },
      );

      expect(second.strategyNotes).toEqual([]);
      expect(second.strategyCandidates?.at(-1)).toMatchObject({
        successes: 1,
        failures: 0,
        status: "candidate",
      });
    },
  );

  it(
    "retains only after three supports from at least two independent origins",
    () => {
      const one = observeStrategy(
        baseState(),
        "inspect before claiming done",
        true,
        {
          sourceId: "turn-1:verification",
          originId: "turn-1",
          occurredAt: "2026-09-14T20:00:00.000Z",
        },
      );

      const two = observeStrategy(
        one,
        "inspect before claiming done",
        true,
        {
          sourceId: "turn-2:verification",
          originId: "turn-2",
          occurredAt: "2026-09-14T20:01:00.000Z",
        },
      );

      const three = observeStrategy(
        two,
        "inspect before claiming done",
        true,
        {
          sourceId: "turn-3:verification",
          originId: "turn-2",
          occurredAt: "2026-09-14T20:02:00.000Z",
        },
      );

      expect(three.strategyNotes).toContain(
        "inspect before claiming done",
      );
      expect(three.strategyCandidates?.at(-1)?.status).toBe(
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
