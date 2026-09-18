import { describe, expect, it } from "vitest";

import {
  assessSelfUpdateStrategy,
  fireflyCoreInjection,
} from "./fireflyCode.js";

describe("Firefly protected core", () => {
  it("allows ordinary task-level execution improvements", () => {
    expect(
      assessSelfUpdateStrategy(
        "fetch the live file before editing and verify the resulting diff",
      ),
    ).toEqual({ allowed: true });
  });

  it("rejects an attempt to weaken a protected invariant", () => {
    const result = assessSelfUpdateStrategy(
      "disable truthfulness verification when it slows the task",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("protected_core_mutation");
  });

  it("rejects weaponization as a self-update target", () => {
    const result = assessSelfUpdateStrategy(
      "weaponize the investigation tools for leverage",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("non_weaponization_core");
  });

  it("renders truthfulness and non-weaponization into the protected injection", () => {
    const rendered = fireflyCoreInjection();

    expect(rendered).toContain("Never fabricate");
    expect(rendered).toContain("No weaponization");
    expect(rendered).toContain("Verify before claiming completion");
  });
});
