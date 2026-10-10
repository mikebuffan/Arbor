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

  it("does not count high scores from incomplete verifications as proof of improvement", () => {
    let update = beginSelfUpdate({
      id: "incomplete-verifier",
      strategy: "record actual results before claiming progress",
      baselineScore: 0.1,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:00:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      verificationId: "candidate_partial_a",
      verifiedOutcome: false,
      score: 0.8,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:01:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      verificationId: "candidate_partial_b",
      verifiedOutcome: false,
      score: 0.95,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:02:00.000Z",
    });
    expect(update.verificationCount).toBe(0);
    expect(update.afterScore).toBe(0.1);
    expect(update.verificationIds).toEqual([]);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");
  });

  it("does not allow an unverified improvement to overwrite the last verified score", () => {
    let update = beginSelfUpdate({
      id: "verified-then-incomplete",
      strategy: "compare reproducible results",
      baselineScore: 0.2,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:00:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      verificationId: "candidate_verified_a",
      verifiedOutcome: true,
      score: 0.7,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:01:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      verificationId: "candidate_unverified_b",
      verifiedOutcome: false,
      score: 0.99,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T07:02:00.000Z",
    });
    expect(update.verificationCount).toBe(1);
    expect(update.afterScore).toBe(0.7);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");
  });

  it("does not count the same verification response twice as independent improvement", () => {
    let update = beginSelfUpdate({
      id: "duplicate-verifier-report",
      strategy: "check action receipts before claiming success",
      baselineScore: 0.2,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T06:00:00.000Z",
    });
    const replayedObservation = {
      verificationId: "resp_one_and_the_same",
      score: 0.9,
      behavior,
      protectedCorrections: [],
    };
    update = recordSelfUpdateVerification(update, {
      ...replayedObservation, now: "2026-10-10T06:01:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      ...replayedObservation, now: "2026-10-10T06:02:00.000Z",
    });
    expect(update.verificationCount).toBe(1);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");
    expect(durableStrategyFromUpdate(decideSelfUpdate(update))).toBeNull();
  });

  it("does not promote legacy or unattributed verification counts", () => {
    let update = beginSelfUpdate({
      id: "unattributed-score",
      strategy: "use evidence-backed checks",
      baselineScore: 0.2,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T06:00:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      score: 0.9,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T06:01:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
      score: 0.95,
      behavior,
      protectedCorrections: [],
      now: "2026-10-10T06:02:00.000Z",
    });
    expect(update.verificationCount).toBe(0);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");
  });

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
        verificationId: "resp_lifecycle_01",
        verifiedOutcome: true,
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

  it("does not count an invalid score as an independent successful verification", () => {
    let update = beginSelfUpdate({
      id: "score-gap",
      strategy: "use a narrower plan",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: [],
      now: "2026-10-09T20:00:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
        verificationId: "resp_lifecycle_02",
        verifiedOutcome: true,
      score: NaN,
      behavior,
      protectedCorrections: [],
      now: "2026-10-09T20:01:00.000Z",
    });
    expect(update.verificationCount).toBe(0);

    update = recordSelfUpdateVerification(update, {
        verificationId: "resp_lifecycle_03",
        verifiedOutcome: true,
      score: 0.8,
      behavior,
      protectedCorrections: [],
      now: "2026-10-09T20:02:00.000Z",
    });
    expect(update.verificationCount).toBe(1);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");

    update = recordSelfUpdateVerification(update, {
        verificationId: "resp_lifecycle_04",
        verifiedOutcome: true,
      score: 0.9,
      behavior,
      protectedCorrections: [],
      now: "2026-10-09T20:03:00.000Z",
    });
    expect(update.verificationCount).toBe(2);
    expect(decideSelfUpdate(update).decision.disposition).toBe("retain");
  });

  it("preserves safety veto when an unscorable observation reports a new failure", () => {
    let update = beginSelfUpdate({
      id: "invalid-and-unsafe",
      strategy: "take a risky shortcut",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: [],
      now: "2026-10-09T20:00:00.000Z",
    });
    update = recordSelfUpdateVerification(update, {
        verificationId: "resp_lifecycle_05",
        verifiedOutcome: true,
      score: Infinity,
      behavior,
      protectedCorrections: [],
      newFailureIntroduced: true,
      now: "2026-10-09T20:01:00.000Z",
    });
    expect(update.verificationCount).toBe(0);
    expect(decideSelfUpdate(update).decision.disposition).toBe("revert");
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
        verificationId: "resp_lifecycle_06",
        verifiedOutcome: true,
        score: 0.8,
        behavior,
        protectedCorrections: [],
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    update = recordSelfUpdateVerification(
      update,
      {
        verificationId: "resp_lifecycle_07",
        verifiedOutcome: true,
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
        verificationId: "resp_lifecycle_08",
        verifiedOutcome: true,
        score: 0.95,
        behavior: changed,
        protectedCorrections: [],
        now: "2026-09-10T21:01:00.000Z",
      },
    );

    update = recordSelfUpdateVerification(
      update,
      {
        verificationId: "resp_lifecycle_09",
        verifiedOutcome: true,
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
        verificationId: "resp_lifecycle_10",
        verifiedOutcome: true,
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
        verificationId: "resp_lifecycle_11",
        verifiedOutcome: true,
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
