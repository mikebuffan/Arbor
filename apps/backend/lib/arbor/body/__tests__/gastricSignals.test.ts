import { describe, expect, it } from "vitest";
import {
  classifyInternalSignal,
  INTERNAL_SIGNAL_ALIASES,
} from "@/lib/arbor/body/gastricSignals";

describe("gastric internal signals", () => {
  it("recovers the historical EMPTY/FULL/SOUR/NERVOUS/BLOCKED vocabulary", () => {
    expect(Object.keys(INTERNAL_SIGNAL_ALIASES).sort()).toEqual(
      ["BLOCKED", "EMPTY", "FULL", "NERVOUS", "SOUR"].sort(),
    );
    expect(INTERNAL_SIGNAL_ALIASES.BLOCKED).toContain("flu");
  });

  it("classifies overload as FULL", () => {
    expect(
      classifyInternalSignal({
        userMessage: "This is too much. Keep it simple.",
      }).state,
    ).toBe("FULL");
  });

  it("classifies rejected direction as BLOCKED without discarding the parent objective", () => {
    const signal = classifyInternalSignal({
      userMessage: "Wrong direction. Do not proceed with that.",
    });
    expect(signal.state).toBe("BLOCKED");
    expect(signal.responseGuidance).toContain("preserve the parent objective");
  });

  it("classifies challenge requests as SOUR", () => {
    expect(
      classifyInternalSignal({
        userMessage: "Are you sure? Push back if that is weak logic.",
      }).state,
    ).toBe("SOUR");
  });

  it("classifies verification/danger signals as NERVOUS", () => {
    expect(
      classifyInternalSignal({
        userMessage: "This may be unsafe. Slow down and verify.",
      }).state,
    ).toBe("NERVOUS");
  });

  it("treats tiny ambiguous input as EMPTY but tells runtime to use context first", () => {
    const signal = classifyInternalSignal({ userMessage: "hmm" });
    expect(signal.state).toBe("EMPTY");
    expect(signal.responseGuidance).toContain("existing context first");
  });
});
