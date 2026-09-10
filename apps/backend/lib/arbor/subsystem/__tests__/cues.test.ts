import { describe, expect, it } from "vitest";
import { subsystemCue } from "../cues";

describe("subsystemCue", () => {
  it("accepts the exact Annabelle cue with punctuation normalization", () => {
    expect(subsystemCue("Annabelle, kitchen's yours.")).toBe("annabelle");
    expect(subsystemCue("Annabelle, kitchen’s yours")).toBe("annabelle");
  });

  it("does not erase the required comma", () => {
    expect(subsystemCue("Annabelle kitchen's yours")).toBeNull();
    expect(subsystemCue("Arbor kitchen's yours")).toBeNull();
  });

  it("returns control to Arbor with the exact return cue", () => {
    expect(subsystemCue("Arbor, kitchen's yours.")).toBe("arbor");
  });
});
