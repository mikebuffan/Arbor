import { describe, expect, it } from "vitest";
import { composeArborSystemInjection } from "../context";

describe("Annabelle prose calibration boundaries", () => {
  it("uses evidence-led judgment rather than mandatory beat ordering", () => {
    const text = composeArborSystemInjection({
      activeSubsystem: "annabelle", canonicalSelfModelBlock: "IDENTITY",
      annabelleWorkspaceBlock: "LOCKED_SOURCE_AND_CORRECTIONS",
    });
    expect(text).toContain("no mandatory sequence");
    expect(text).toContain("accepted project corrections");
    expect(text).toContain("professional versus private register");
    expect(text).toContain("edit only the authorized scope");
    expect(text).not.toContain("atmosphere/body first");
    expect(text).not.toContain("dialogue last when possible");
    expect(text).toContain("LOCKED_SOURCE_AND_CORRECTIONS");
  });
});
