import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  AgencyState,
} from "../agency/engine";

import {
  resolveAgencyGoal,
} from "../agency/continuation";

import {
  projectHostStartup,
  switchAuthority,
  switchHostSurface,
  type OneArborHostState,
} from "../host/oneArborHostBridge";

const agency: AgencyState = {
  goal:
    "repair longitudinal memory",
  status: "active",
  currentStep: 9,
  unresolvedWork: [
    "verify Text to Voice continuity",
  ],
  recurringWeaknesses: [
    "required repeated go prompts",
  ],
  strategyNotes: [
    "carry live goals through ordinary follow-ups",
  ],
  blocker: null,
};

const host: OneArborHostState = {
  schemaVersion: 1,
  sessionId: "session-1",
  projectId: "project-1",
  conversationId:
    "conversation-2",
  surface: "text",
  authority: "arbor",
  currentGoal:
    agency.goal,
  lastMeaningfulUserTurn:
    "Make sure you run the code in here please",
  lastMeaningfulArborTurn:
    "Continuing the repair.",
  unresolvedWork: [
    {
      id: "work-1",
      title:
        "verify Text to Voice continuity",
      status: "active",
      nextAction:
        "run linearity proof",
    },
  ],
  corrections: [
    {
      id: "behavior-1",
      kind: "behavior",
      text:
        "Do not require repeated go prompts",
      createdAt:
        "2026-09-13T19:00:00.000Z",
    },
    {
      id: "voice-1",
      kind: "acoustic",
      text:
        "General American, not British",
      createdAt:
        "2026-09-13T19:01:00.000Z",
    },
  ],
  behaviorProof: null,
  updatedAt:
    "2026-09-13T19:02:00.000Z",
};

describe(
  "One Arbor longitudinal linearity",
  () => {
    it(
      "carries a live goal through a normal follow-up without a magic continuation phrase",
      () => {
        expect(
          resolveAgencyGoal(
            "Make sure the corrections carry into voice too",
            agency,
          ),
        ).toEqual({
          goal:
            "repair longitudinal memory",
          resume: true,
          superseded: false,
        });
      },
    );

    it(
      "keeps goal, unresolved work, and behavioral corrections across Text to Voice",
      () => {
        const voice =
          switchHostSurface(
            host,
            "voice",
            "2026-09-13T19:03:00.000Z",
          );

        const startup =
          projectHostStartup(
            voice,
          );

        expect(
          startup.interactionMode,
        ).toBe("voice");

        expect(
          startup.promptBlock,
        ).toContain(
          "repair longitudinal memory",
        );

        expect(
          startup.promptBlock,
        ).toContain(
          "verify Text to Voice continuity",
        );

        expect(
          startup.promptBlock,
        ).toContain(
          "Do not require repeated go prompts",
        );

        expect(
          startup.acousticCorrections,
        ).toEqual([
          "General American, not British",
        ]);
      },
    );

    it(
      "switches Annabelle authority without resetting shared continuity",
      () => {
        const annabelle =
          switchAuthority(
            host,
            "annabelle",
            "2026-09-13T19:04:00.000Z",
          );

        const startup =
          projectHostStartup(
            annabelle,
          );

        expect(
          startup.interactionMode,
        ).toBe(
          "annabelle",
        );

        expect(
          annabelle.currentGoal,
        ).toBe(
          host.currentGoal,
        );

        expect(
          annabelle.unresolvedWork,
        ).toEqual(
          host.unresolvedWork,
        );

        expect(
          annabelle.corrections,
        ).toEqual(
          host.corrections,
        );
      },
    );
  },
);
