import { describe, expect, it } from "vitest";
import { resolveSubsystemCue } from "../cues";

describe("resolveSubsystemCue", () => {
  it("accepts the exact Annabelle cue with punctuation normalization", () => {
    expect(resolveSubsystemCue("Annabelle, kitchen's yours.")).toBe("annabelle");
    expect(resolveSubsystemCue("Annabelle, kitchen’s yours")).toBe("annabelle");
  });

  it("does not erase the required comma", () => {
    expect(resolveSubsystemCue("Annabelle kitchen's yours")).toBeNull();
    expect(resolveSubsystemCue("Arbor kitchen's yours")).toBeNull();
  });

  it("returns control to Arbor with the exact return cue", () => {
    expect(resolveSubsystemCue("Arbor, kitchen's yours.")).toBe("arbor");
  });
});
