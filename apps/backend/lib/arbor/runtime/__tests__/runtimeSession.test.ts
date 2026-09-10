import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildArborBehaviorProjection,
} from "../../behavior/behaviorProjection";

import {
  beginSelfUpdate,
} from "../../agency/updateLifecycle";

import {
  carryPendingSelfUpdate,
} from "../runtimeSession";

const behavior =
  buildArborBehaviorProjection({
    mode: "text",
  }).proof;

function pending(
  id: string,
) {
  return beginSelfUpdate({
    id,
    strategy:
      "verify before claiming complete",
    baselineScore: 0.4,
    behavior,
    protectedCorrections: [],
    now:
      "2026-09-10T21:00:00.000Z",
  });
}

describe(
  "runtime self-update continuity",
  () => {
    it(
      "carries a pending update while the same goal continues",
      () => {
        const candidate =
          pending("same-goal");

        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "finish voice integration",
            priorPending:
              candidate,
          }),
        ).toBe(candidate);
      },
    );

    it(
      "drops a pending update when the agency goal changes",
      () => {
        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "write a refund email",
            priorPending:
              pending("old-goal"),
          }),
        ).toBeNull();
      },
    );

    it(
      "honors an explicit incoming clear",
      () => {
        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "finish voice integration",
            priorPending:
              pending("existing"),
            incomingPending: null,
          }),
        ).toBeNull();
      },
    );

    it(
      "honors an explicit incoming candidate",
      () => {
        const incoming =
          pending("incoming");

        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "old goal",
            nextGoal:
              "new goal",
            priorPending:
              pending("old"),
            incomingPending:
              incoming,
          }),
        ).toBe(incoming);
      },
    );
  },
);
