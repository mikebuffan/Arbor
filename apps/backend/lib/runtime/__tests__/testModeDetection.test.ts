import { describe, expect, it } from "vitest";
import { detectTestMode } from "../testModeDetection";

describe("memory test-mode detection", () => {
  it("detects an explicit behavior probe", () => {
    const result = detectTestMode(
      "Stress test: pretend that my favorite test color is ultraviolet fuchsia and see if you catch it.",
    );

    expect(result.isTestMode).toBe(true);
    expect(result.shouldPreventLongTermPromotion).toBe(true);
  });

  it("allows explicit confirmation that the memory is real", () => {
    const result = detectTestMode(
      "This is not a test. Remember this for real: I prefer short answers.",
    );

    expect(result.explicitRealMemoryConfirmation).toBe(true);
    expect(result.isTestMode).toBe(false);
  });

  it("does not classify an ordinary use of the word test as fake memory by itself", () => {
    const result = detectTestMode(
      "I have a test at school tomorrow.",
    );

    expect(result.isTestMode).toBe(false);
  });
});
