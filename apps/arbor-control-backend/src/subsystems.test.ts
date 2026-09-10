import { describe, expect, it } from "vitest";
import { resolveSubsystem } from "./subsystems.js";

describe("subsystem routing", () => {
  it("requires the comma in the Annabelle cue", () => {
    expect(
      resolveSubsystem("Annabelle, kitchen's yours.", "arbor"),
    ).toBe("annabelle");

    expect(
      resolveSubsystem("Annabelle kitchen's yours", "arbor"),
    ).toBe("arbor");
  });

  it("returns to Arbor without resetting shared identity", () => {
    expect(
      resolveSubsystem("Arbor, kitchen’s yours.", "annabelle"),
    ).toBe("arbor");
  });
});
