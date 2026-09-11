import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyHostCorrection,
  projectHostStartup,
  switchAuthority,
  switchHostSurface,
  type OneArborHostState,
} from "../oneArborHostBridge";
import {
  projectVoiceAcoustics,
} from "../../voice/acousticProjection";

const start: OneArborHostState = {
  schemaVersion: 1,
  sessionId: "acceptance-turn",
  projectId: "acceptance-project",
  conversationId: "acceptance-conversation",
  surface: "text",
  authority: "arbor",
  currentGoal: "finish Arbor integration",
  lastMeaningfulUserTurn:
    "Keep going without waiting for me.",
  lastMeaningfulArborTurn:
    "I am continuing the integration.",
  unresolvedWork: [
    {
      id: "deploy",
      title: "verify live deployment",
      status: "active",
      nextAction: "run deployment acceptance",
    },
  ],
  corrections: [],
  behaviorProof: null,
  updatedAt: "2026-09-10T23:05:00.000Z",
};

describe("One Arbor end-to-end host acceptance", () => {
  it("preserves one identity state across Text, Voice, Annabelle, and back", () => {
    const behaviorCorrected = applyHostCorrection(
      start,
      {
        id: "behavior-1",
        kind: "behavior",
        text: "Continue obvious reversible work without waiting for another go.",
        createdAt: "2026-09-10T23:05:01.000Z",
      },
    );

    const corrected = applyHostCorrection(
      behaviorCorrected,
      {
        id: "acoustic-1",
        kind: "acoustic",
        text: "Use natural General American speech; avoid British accent drift.",
        createdAt: "2026-09-10T23:05:02.000Z",
      },
    );

    const voice = switchHostSurface(
      corrected,
      "voice",
      "2026-09-10T23:05:03.000Z",
    );

    const voiceStartup = projectHostStartup(voice);
    const voiceAcoustics = projectVoiceAcoustics(
      "arbor",
      voiceStartup.acousticCorrections,
    );

    expect(voiceStartup.interactionMode).toBe("voice");
    expect(voiceStartup.promptBlock).toContain(
      "finish Arbor integration",
    );
    expect(voiceStartup.promptBlock).toContain(
      "verify live deployment",
    );
    expect(voiceStartup.promptBlock).toContain(
      "Keep going without waiting for me.",
    );
    expect(voiceStartup.promptBlock).toContain(
      "Continue obvious reversible work without waiting for another go.",
    );
    expect(voiceStartup.promptBlock).not.toContain(
      "VOICE RENDERING TARGET:",
    );
    expect(voiceStartup.promptBlock).not.toContain(
      "Use natural General American speech; avoid British accent drift.",
    );
    expect(voiceStartup.acousticCorrections).toEqual([
      "Use natural General American speech; avoid British accent drift.",
    ]);
    expect(voiceAcoustics.instructions).toContain(
      "Use natural General American speech; avoid British accent drift.",
    );

    const annabelle = switchAuthority(
      voice,
      "annabelle",
      "2026-09-10T23:05:04.000Z",
    );

    const annabelleStartup =
      projectHostStartup(annabelle);
    const annabelleAcoustics = projectVoiceAcoustics(
      "annabelle",
      annabelleStartup.acousticCorrections,
    );

    expect(annabelleStartup.interactionMode).toBe(
      "annabelle",
    );
    expect(annabelleStartup.promptBlock).not.toContain(
      "Use natural General American speech; avoid British accent drift.",
    );
    expect(annabelleAcoustics.instructions).toContain(
      "Use natural General American speech; avoid British accent drift.",
    );
    expect(annabelleAcoustics.instructions).toContain(
      "same underlying Arbor voice",
    );
    expect(annabelle.currentGoal).toBe(
      start.currentGoal,
    );
    expect(annabelle.unresolvedWork).toEqual(
      start.unresolvedWork,
    );
    expect(annabelle.corrections).toEqual(
      corrected.corrections,
    );

    const arborAgain = switchAuthority(
      annabelle,
      "arbor",
      "2026-09-10T23:05:05.000Z",
    );

    const textAgain = switchHostSurface(
      arborAgain,
      "text",
      "2026-09-10T23:05:06.000Z",
    );

    const finalStartup =
      projectHostStartup(textAgain);

    expect(finalStartup.interactionMode).toBe("text");
    expect(finalStartup.promptBlock).not.toContain(
      "VOICE RENDERING TARGET:",
    );
    expect(finalStartup.promptBlock).not.toContain(
      "Use natural General American speech; avoid British accent drift.",
    );
    expect(textAgain.currentGoal).toBe(
      start.currentGoal,
    );
    expect(textAgain.lastMeaningfulUserTurn).toBe(
      start.lastMeaningfulUserTurn,
    );
    expect(textAgain.lastMeaningfulArborTurn).toBe(
      start.lastMeaningfulArborTurn,
    );
    expect(textAgain.unresolvedWork).toEqual(
      start.unresolvedWork,
    );
    expect(finalStartup.behavioralCorrections).toEqual([
      "Continue obvious reversible work without waiting for another go.",
    ]);
    expect(finalStartup.acousticCorrections).toEqual([
      "Use natural General American speech; avoid British accent drift.",
    ]);
  });
});
