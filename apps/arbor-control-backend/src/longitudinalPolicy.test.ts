import {
  describe,
  expect,
  it,
} from "vitest";

import {
  shouldCarryGoal,
} from "./longitudinalPolicy.js";
import type {
  ArborState,
} from "./types.js";

function prior(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "repair longitudinal memory",
    unresolvedWork: [
      "verify Text to Voice continuity",
    ],
    strategyNotes: [],
    behavioralCorrections: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

describe("control longitudinal goal routing", () => {
  it.each([
    "go",
    "okay",
    "continue",
    "keep going",
    "do it",
    "yes",
  ])("carries explicit continuation %s", (text) => {
    const state = prior();
    expect(shouldCarryGoal(text, state)).toBe(true);
    expect(state.goal).toBe("repair longitudinal memory");
    expect(state.suspendedOpenLoops ?? []).toHaveLength(0);
  });

  it("carries an ordinary contextual follow-up", () => {
    const state = prior();
    expect(
      shouldCarryGoal(
        "Make sure the corrections carry into voice too",
        state,
      ),
    ).toBe(true);
    expect(state.suspendedOpenLoops ?? []).toHaveLength(0);
  });

  it("routes an unrelated substantive question to foreground and checkpoints the live job", () => {
    const state = prior();

    expect(
      shouldCarryGoal(
        "Why did Mike compare me to Einstein?",
        state,
      ),
    ).toBe(false);

    expect(state.goal).toBe(
      "Why did Mike compare me to Einstein?",
    );
    expect(state.unresolvedWork).toEqual([
      "complete goal: Why did Mike compare me to Einstein?",
    ]);
    expect(state.suspendedOpenLoops).toHaveLength(1);
    expect(state.suspendedOpenLoops?.[0]?.goal).toBe(
      "repair longitudinal memory",
    );
  });

  it("does not require magic switch language for an unrelated question", () => {
    const state = prior();
    expect(
      shouldCarryGoal(
        "What did I eat yesterday?",
        state,
      ),
    ).toBe(false);
    expect(state.suspendedOpenLoops).toHaveLength(1);
  });

  it("honors explicit supersession without retaining the dropped job", () => {
    const state = prior();
    const text =
      "Switch to a new task: explain the deployment failure";

    expect(shouldCarryGoal(text, state)).toBe(false);
    expect(state.goal).toBe(text);
    expect(state.unresolvedWork).toEqual([
      `complete goal: ${text}`,
    ]);
    expect(state.suspendedOpenLoops).toEqual([]);
  });
});
