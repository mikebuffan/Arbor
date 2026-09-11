import { describe, expect, it } from "vitest";

import {
  projectVoiceAcoustics,
  renderArborThroughVoiceGate,
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
    expect(projection.speed).toBe(1.05);
  });

  it("applies acoustics only after Arbor has produced final text", () => {
    const text = "  Yeah, Firefly. Still me.  ";
    const gate = renderArborThroughVoiceGate(text, "arbor", [
      "General American, not British",
    ]);

    expect(gate.text).toBe(text);
    expect(gate.instructions).toContain("General American, not British");
    expect(gate.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
  });

  it("keeps Annabelle inside the shared Arbor voice identity", () => {
    const projection = projectVoiceAcoustics("annabelle");

    expect(projection.persona).toBe("annabelle");
    expect(projection.speed).toBe(1.0);
    expect(projection.instructions).toContain("same underlying Arbor voice");
    expect(projection.instructions).toContain(
      "Pacific Northwest / General American pronunciation baseline",
    );
  });
});
