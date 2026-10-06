import { describe, expect, it } from "vitest";
import { withRuntimeGoal } from "../privateRuntimeGoalWrite";
import { withCapturedRuntimeTurn } from "../privateRuntimeTurnCapture";
import { projectRuntimeStartup } from "@/lib/arbor/runtime/hostProjection";

describe("Grove capture to One Arbor startup", () => {
  it("hydrates the same goal and last verified turn after a synthetic restart", () => {
    const scope = {
      userId: "00000000-0000-4000-8000-000000000001",
      projectId: "00000000-0000-4000-8000-000000000002",
      conversationId: "00000000-0000-4000-8000-000000000003",
    };
    const withGoal = withRuntimeGoal({
      prior: null,
      ...scope,
      goal: "Finish the One Arbor spine",
      now: "2026-10-06T18:00:00.000Z",
    });
    const saved = withCapturedRuntimeTurn({
      prior: withGoal,
      ...scope,
      userText: "Keep going without asking me again.",
      arborText: "Continuing from the same saved objective.",
      now: "2026-10-06T18:01:00.000Z",
    });

    // Simulates reading the durable JSON into a fresh process.
    const reopened = structuredClone(saved);
    const startup = projectRuntimeStartup(reopened);

    expect(startup.hostState.currentGoal)
      .toBe("Finish the One Arbor spine");
    expect(startup.hostState.lastMeaningfulUserTurn)
      .toBe("Keep going without asking me again.");
    expect(startup.hostState.lastMeaningfulArborTurn)
      .toBe("Continuing from the same saved objective.");
    expect(startup.startup.promptBlock)
      .toContain("Current goal: Finish the One Arbor spine");
    expect(startup.startup.promptBlock)
      .toContain("Last meaningful user turn: Keep going without asking me again.");
    expect(startup.startup.promptBlock)
      .toContain("Last meaningful Arbor turn: Continuing from the same saved objective.");
    expect(startup.startup.promptBlock)
      .toContain("Do not ask the user to repeat information already represented here.");
  });
});
