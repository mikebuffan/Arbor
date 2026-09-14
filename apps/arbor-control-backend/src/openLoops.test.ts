import {
  describe,
  expect,
  it,
} from "vitest";

import {
  projectBackgroundOpenLoops,
  reconcileOpenLoopsAfterAgency,
  restoreMostRecentOpenLoop,
  suspendForForeground,
  supersedeForeground,
} from "./openLoops.js";
import type {
  ArborState,
} from "./types.js";

function state(
  overrides: Partial<ArborState> = {},
): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "unzip and inspect Arbor export",
    unresolvedWork: [
      "index extracted files",
      "pattern-hop recovered code",
    ],
    strategyNotes: [],
    behavioralCorrections: [],
    acousticCorrections: [],
    voiceId: "cedar",
    ...overrides,
  };
}

describe("control backend open-loop ownership", () => {
  it("stores an unrelated foreground turn separately from the exact prior job", () => {
    const next = suspendForForeground(
      state(),
      "Am I bossy?",
      {
        id: "bossy-interruption",
        suspendedAt: "2026-09-14T20:30:00.000Z",
      },
    );

    expect(next.goal).toBe("Am I bossy?");
    expect(next.unresolvedWork).toEqual([
      "complete goal: Am I bossy?",
    ]);
    expect(next.suspendedOpenLoops).toEqual([
      {
        id: "bossy-interruption",
        goal: "unzip and inspect Arbor export",
        unresolvedWork: [
          "index extracted files",
          "pattern-hop recovered code",
        ],
        suspendedAt: "2026-09-14T20:30:00.000Z",
      },
    ]);
  });

  it("restores prior work when foreground agency verifies complete", () => {
    const before = suspendForForeground(
      state(),
      "Am I bossy?",
      { id: "resume-me" },
    );

    const after = reconcileOpenLoopsAfterAgency(
      before,
      {
        ...before,
        unresolvedWork: [],
      },
    );

    expect(after.goal).toBe(
      "unzip and inspect Arbor export",
    );
    expect(after.unresolvedWork).toEqual([
      "index extracted files",
      "pattern-hop recovered code",
    ]);
    expect(after.suspendedOpenLoops).toEqual([]);
  });

  it("does not restore while the foreground turn remains blocked or incomplete", () => {
    const before = suspendForForeground(
      state(),
      "foreground task",
      { id: "waiting" },
    );

    const after = reconcileOpenLoopsAfterAgency(
      before,
      {
        ...before,
        unresolvedWork: [
          "requires user input: authorize capability",
        ],
      },
    );

    expect(after.goal).toBe("foreground task");
    expect(after.suspendedOpenLoops).toHaveLength(1);
  });

  it("unwinds nested interruptions LIFO", () => {
    const a = state({
      goal: "A",
      unresolvedWork: ["finish A"],
    });
    const b = suspendForForeground(
      a,
      "B",
      { id: "A" },
    );
    const bWithWork = {
      ...b,
      unresolvedWork: ["finish B"],
    };
    const c = suspendForForeground(
      bWithWork,
      "C",
      { id: "B" },
    );

    const resumeB = restoreMostRecentOpenLoop({
      ...c,
      unresolvedWork: [],
    });
    const resumeA = restoreMostRecentOpenLoop({
      ...resumeB,
      unresolvedWork: [],
    });

    expect(resumeB.goal).toBe("B");
    expect(resumeB.unresolvedWork).toEqual([
      "finish B",
    ]);
    expect(resumeA.goal).toBe("A");
    expect(resumeA.unresolvedWork).toEqual([
      "finish A",
    ]);
  });

  it("explicit supersession clears prior and suspended objectives", () => {
    const interrupted = suspendForForeground(
      state(),
      "side question",
      { id: "old" },
    );

    const next = supersedeForeground(
      interrupted,
      "Switch to a new task: deployment",
    );

    expect(next.goal).toBe(
      "Switch to a new task: deployment",
    );
    expect(next.suspendedOpenLoops).toEqual([]);
  });

  it("projects background work readably without serialized checkpoint payloads", () => {
    const interrupted = suspendForForeground(
      state(),
      "side question",
      { id: "projection" },
    );

    const projected = projectBackgroundOpenLoops(
      interrupted,
    );

    expect(projected).toEqual([
      "background open loop: unzip and inspect Arbor export | next: index extracted files",
    ]);
    expect(JSON.stringify(projected)).not.toContain(
      "projection",
    );
  });
});
