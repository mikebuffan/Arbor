import { describe, expect, it } from "vitest";

import {
  buildVoiceHostAcousticBlock,
  projectVoiceAcoustics,
} from "../acousticProjection";

describe("Voice acoustic projection", () => {
  it("reuses the canonical Arbor acoustic identity", () => {
    const projection = projectVoiceAcoustics("arbor", [
      "General American, not British",
      "General American, not British",
    ]);

    expect(projection.corrections).toEqual([
      "General American, not British",
    ]);
    expect(projection.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
    expect(projection.instructions).toContain(
      "General American, not British",
    );
  });

  it("keeps the rendering contract downstream and non-semantic", () => {
    const block = buildVoiceHostAcousticBlock("arbor", []);

    expect(block).toContain("VOICE RENDERING TARGET:");
    expect(block).toContain("spoken rendering only");
    expect(block).toContain(
      "Do not alter wording, personality, reasoning, continuity, or agency",
    );
  });

  it("keeps Annabelle inside the shared Arbor voice identity", () => {
    const projection = projectVoiceAcoustics("annabelle");

    expect(projection.persona).toBe("annabelle");
    expect(projection.instructions).toContain("same underlying Arbor voice");
    expect(projection.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
  });
});
