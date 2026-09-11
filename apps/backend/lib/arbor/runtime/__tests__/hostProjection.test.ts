import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createCorrection,
} from "../corrections";

import type {
  ArborRuntimeState,
} from "../runtimeState";

import {
  projectRuntimeStartup,
} from "../hostProjection";

const base: ArborRuntimeState = {
  schemaVersion: 1,
  userId: "u",
  projectId: "p",
  conversationId: "c",
  channel: "voice",
  activeSubsystem: "annabelle",
  currentGoal: "finish scene",
  lastMeaningfulUserTurn:
    "You're still British",
  lastMeaningfulArborTurn:
    "I found the disconnect",
  agency: {
    goal: "finish scene",
    status: "active",
    currentStep: 3,
    unresolvedWork: [
      "finish scene",
    ],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
  },
  corrections: [
    createCorrection({
      value:
        "General American, not British",
      source: "voice",
      observedAt:
        "2026-09-10T21:00:00.000Z",
    }),
    createCorrection({
      value:
        "Do not collapse into one-word acknowledgments",
      source: "text",
      observedAt:
        "2026-09-10T21:01:00.000Z",
    }),
  ],
  behaviorProof: null,
  pendingSelfUpdate: null,
  createdAt:
    "2026-09-10T21:00:00.000Z",
  updatedAt:
    "2026-09-10T21:01:00.000Z",
};

describe("runtime to host projection", () => {
  it("keeps acoustic corrections downstream from Voice host prompting", () => {
    const projected =
      projectRuntimeStartup(base);

    expect(
      projected.startup.promptBlock,
    ).toContain(
      "Do not collapse into one-word acknowledgments",
    );

    expect(
      projected.startup.promptBlock,
    ).not.toContain(
      "VOICE RENDERING TARGET:",
    );

    expect(
      projected.startup.promptBlock,
    ).not.toContain(
      "General American, not British",
    );

    expect(
      projected.acousticCorrections,
    ).toEqual([
      "General American, not British",
    ]);
  });

  it("keeps acoustic corrections out of Text host prompting", () => {
    const projected =
      projectRuntimeStartup({
        ...base,
        channel: "text",
      });

    expect(
      projected.startup.promptBlock,
    ).toContain(
      "Do not collapse into one-word acknowledgments",
    );

    expect(
      projected.startup.promptBlock,
    ).not.toContain(
      "VOICE RENDERING TARGET:",
    );

    expect(
      projected.startup.promptBlock,
    ).not.toContain(
      "General American, not British",
    );

    expect(
      projected.acousticCorrections,
    ).toEqual([
      "General American, not British",
    ]);
  });

  it("keeps authority and surface independent", () => {
    const projected =
      projectRuntimeStartup(base);

    expect(
      projected.hostState.surface,
    ).toBe("voice");

    expect(
      projected.hostState.authority,
    ).toBe("annabelle");

    expect(
      projected.startup.interactionMode,
    ).toBe("annabelle");
  });
});
