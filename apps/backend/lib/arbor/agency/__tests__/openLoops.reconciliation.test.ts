import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import {
  decodeSuspendedOpenLoop,
  preserveSuspendedOpenLoops,
  projectAgencyWorkForPrompt,
  restoreMostRecentOpenLoop,
  splitAgencyWork,
  suspendAgencyIntoWork,
} from "../openLoops";

function agency(overrides: Partial<AgencyState> = {}): AgencyState {
  return {
    goal: "finish master reconciliation",
    status: "active",
    currentStep: 12,
    unresolvedWork: ["reconcile memory", "reconcile body"],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
    objective: {
      parentGoal: "finish master reconciliation",
      completionCriteria: ["verified"],
      standingAuthorization: ["continue reversible work"],
      hardStops: ["external authority"],
      nextAction: "reconcile memory",
      checkpoint: "step 12",
      status: "active",
      revision: 7,
      execution: null,
    },
    ...overrides,
  };
}

describe("durable interrupted open loops", () => {
  it("keeps unfinished work while an unrelated foreground turn runs", () => {
    const work = suspendAgencyIntoWork(
      ["complete goal: answer side question"],
      agency(),
      { id: "side", suspendedAt: "2026-10-01T18:00:00.000Z" },
    );
    const split = splitAgencyWork(work);
    expect(split.current).toEqual(["complete goal: answer side question"]);
    expect(split.suspended).toHaveLength(1);
    expect(split.suspended[0].checkpoint.goal).toBe("finish master reconciliation");
    expect(split.suspended[0].checkpoint.objective?.revision).toBe(7);
  });

  it("keeps suspended work through progress replacement", () => {
    const interrupted = suspendAgencyIntoWork(["foreground"], agency(), { id: "old" });
    const next = preserveSuspendedOpenLoops(interrupted, ["verify foreground"]);
    const split = splitAgencyWork(next);
    expect(split.current).toEqual(["verify foreground"]);
    expect(split.suspended[0].checkpoint.goal).toBe("finish master reconciliation");
  });

  it("restores the newest interrupted objective and keeps older loops", () => {
    const a = agency({ goal: "A", unresolvedWork: ["finish A"] });
    const b = agency({
      goal: "B",
      unresolvedWork: suspendAgencyIntoWork(["finish B"], a, { id: "A" }),
    });
    const c = agency({
      goal: "C",
      unresolvedWork: suspendAgencyIntoWork(["finish C"], b, { id: "B" }),
    });
    const resumeB = restoreMostRecentOpenLoop(c);
    const resumeA = resumeB ? restoreMostRecentOpenLoop(resumeB) : null;
    expect(resumeB?.goal).toBe("B");
    expect(resumeA?.goal).toBe("A");
  });

  it("projects readable background work without exposing internal payloads", () => {
    const stored = suspendAgencyIntoWork(["foreground"], agency(), { id: "projection" });
    const projected = projectAgencyWorkForPrompt(stored);
    expect(projected.join("\n")).toContain("background open loop: finish master reconciliation");
    expect(projected.join("\n")).not.toContain("__arbor_open_loop_");
  });

  it("rejects corrupt internal markers", () => {
    expect(decodeSuspendedOpenLoop("__arbor_open_loop_v2__:%7Bbad-json")).toBeNull();
    expect(projectAgencyWorkForPrompt(["__arbor_open_loop_v2__:%7Bbad-json"])).toEqual([]);
  });
});
