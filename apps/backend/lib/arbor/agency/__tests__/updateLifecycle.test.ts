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
  decideSelfUpdate,
  durableStrategyFromUpdate,
  recordSelfUpdateVerification,
} from "../updateLifecycle";

describe("Arbor self-update lifecycle", () => {
  const behavior =
    buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [
        "Do not flatten into acknowledgments",
      ],
    }).proof;

  it("does not retain after one verification", () => {
    let update = beginSelfUpdate({
      id: "u1",
      strategy: "act before narrating",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: [
        "Do not flatten into acknowledgments",
      ],
      now: "2026-09-10T21:00:00.000Z",
    });

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.9,
        behavior,
        protectedCorrections: [
          "Do not flatten into acknowledgments",
        ],
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    const result = decideSelfUpdate(update);

    expect(
      result.decision.disposition,
    ).toBe("continue_verifying");

    expect(
      durableStrategyFromUpdate(result),
    ).toBeNull();
  });

  it("retains repeated verified improvement", () => {
    let update = beginSelfUpdate({
      id: "u2",
      strategy: "act before narrating",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: [],
      now: "2026-09-10T21:00:00.000Z",
    });

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.8,
        behavior,
        protectedCorrections: [],
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.9,
        behavior,
        protectedCorrections: [],
        now: "2026-09-10T21:02:00.000Z",
      },
    );

    const result = decideSelfUpdate(update);

    expect(
      result.decision.disposition,
    ).toBe("retain");

    expect(
      durableStrategyFromUpdate(result),
    ).toBe("act before narrating");
  });

  it("reverts when identity drifts", () => {
    const changed =
      buildArborBehaviorProjection({
        mode: "text",
        projectBehaviorPhilosophy:
          "Presenter-like and formal.",
      }).proof;

    let update = beginSelfUpdate({
      id: "u3",
      strategy: "be more formal",
      baselineScore: 0.5,
      behavior,
      protectedCorrections: [],
      now: "2026-09-10T21:00:00.000Z",
    });

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.95,
        behavior: changed,
        protectedCorrections: [],
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.95,
        behavior: changed,
        protectedCorrections: [],
        now: "2026-09-10T21:02:00.000Z",
      },
    );

    expect(
      decideSelfUpdate(update).decision.disposition,
    ).toBe("revert");
  });

  it("reverts an improved strategy when output behavior regresses", () => {
    let update = beginSelfUpdate({
      id: "u4",
      strategy: "compress every answer",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: [],
      now: "2026-09-10T21:00:00.000Z",
    });

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.9,
        behavior,
        protectedCorrections: [],
        newFailureIntroduced: true,
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    update = recordSelfUpdateVerification(
      update,
      {
        score: 0.95,
        behavior,
        protectedCorrections: [],
        now: "2026-09-10T21:02:00.000Z",
      },
    );

    expect(
      decideSelfUpdate(update).decision.disposition,
    ).toBe("revert");
  });
});
