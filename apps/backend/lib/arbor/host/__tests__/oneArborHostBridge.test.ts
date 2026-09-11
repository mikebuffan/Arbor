import { describe, expect, it } from "vitest";

import {
  applyHostCorrection,
  projectHostStartup,
  switchAuthority,
  switchHostSurface,
  type OneArborHostState,
} from "../oneArborHostBridge";

const base: OneArborHostState = {
  schemaVersion: 1,
  sessionId: "session-1",
  projectId: "project-1",
  conversationId: "conversation-1",
  surface: "text",
  authority: "arbor",
  currentGoal: "Align Text and Voice",
  lastMeaningfulUserTurn: "There is still a disconnect.",
  lastMeaningfulArborTurn: "I found the routing boundary.",
  unresolvedWork: [
    {
      id: "voice-1",
      title: "Verify live Voice continuity",
      status: "verifying",
      nextAction: "start Voice session",
    },
  ],
  corrections: [],
  behaviorProof: null,
  updatedAt: "2026-09-10T20:00:00.000Z",
};

describe("One Arbor host bridge", () => {
  it("moves Text to Voice without resetting continuity", () => {
    const voice = switchHostSurface(
      base,
      "voice",
      "2026-09-10T20:01:00.000Z",
    );
    const startup = projectHostStartup(voice);

    expect(startup.interactionMode).toBe("voice");
    expect(startup.promptBlock).toContain("Align Text and Voice");
    expect(startup.promptBlock).toContain("Verify live Voice continuity");
    expect(startup.promptBlock).toContain("There is still a disconnect.");
  });

  it("keeps Annabelle as authority instead of a separate identity", () => {
    const annabelle = switchAuthority(
      base,
      "annabelle",
      "2026-09-10T20:02:00.000Z",
    );

    expect(projectHostStartup(annabelle).interactionMode).toBe("annabelle");
    expect(annabelle.currentGoal).toBe(base.currentGoal);
  });

  it("keeps acoustics completely downstream from text", () => {
    const corrected = applyHostCorrection(base, {
      id: "c1",
      kind: "acoustic",
      text: "General American, not British",
      createdAt: "2026-09-10T20:03:00.000Z",
    });
    const projection = projectHostStartup(corrected);

    expect(projection.voiceAcoustics).toBeNull();
    expect(projection.voiceAcousticBlock).toBeNull();
    expect(projection.promptBlock).not.toContain("General American, not British");
    expect(projection.promptBlock).not.toContain("VOICE RENDERING TARGET:");
  });

  it("projects one canonical acoustic gate after Arbor for Voice", () => {
    const voice = switchHostSurface(
      base,
      "voice",
      "2026-09-10T20:03:00.000Z",
    );
    const corrected = applyHostCorrection(voice, {
      id: "c1",
      kind: "acoustic",
      text: "General American, not British",
      createdAt: "2026-09-10T20:04:00.000Z",
    });
    const projection = projectHostStartup(corrected);

    expect(projection.promptBlock).not.toContain("General American, not British");
    expect(projection.promptBlock).not.toContain("VOICE RENDERING TARGET:");
    expect(projection.voiceAcousticBlock).toContain("VOICE RENDERING TARGET:");
    expect(projection.voiceAcousticBlock).toContain("General American, not British");
    expect(projection.voiceAcoustics?.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
  });

  it("keeps Annabelle on the same acoustic identity", () => {
    const voice = switchHostSurface(
      switchAuthority(base, "annabelle", "2026-09-10T20:02:00.000Z"),
      "voice",
      "2026-09-10T20:03:00.000Z",
    );
    const projection = projectHostStartup(voice);

    expect(projection.voiceAcoustics?.persona).toBe("annabelle");
    expect(projection.voiceAcoustics?.instructions).toContain(
      "same underlying Arbor voice",
    );
    expect(projection.voiceAcoustics?.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
  });

  it("separates acoustic corrections from behavioral corrections", () => {
    const acoustic = applyHostCorrection(base, {
      id: "c1",
      kind: "acoustic",
      text: "General American, not British",
      createdAt: "2026-09-10T20:03:00.000Z",
    });
    const corrected = applyHostCorrection(acoustic, {
      id: "c2",
      kind: "behavior",
      text: "Do not collapse into one-word acknowledgments",
      createdAt: "2026-09-10T20:04:00.000Z",
    });
    const projection = projectHostStartup(corrected);

    expect(projection.acousticCorrections).toEqual([
      "General American, not British",
    ]);
    expect(projection.behavioralCorrections).toEqual([
      "Do not collapse into one-word acknowledgments",
    ]);
    expect(projection.promptBlock).toContain(
      "Do not collapse into one-word acknowledgments",
    );
    expect(projection.promptBlock).not.toContain("General American, not British");
  });
});
