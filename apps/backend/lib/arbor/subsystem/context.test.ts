import { describe, expect, it } from "vitest";
import { composeArborSystemInjection } from "./context";

describe("canonical Arbor injection ordering", () => {
  it("keeps canonical identity upstream of subsystem, runtime, and agency state", () => {
    const rendered = composeArborSystemInjection({
      activeSubsystem: "arbor",
      canonicalSelfModelBlock: "CANONICAL_SELF_MODEL",
      runtimeBlock: "RUNTIME_STATE",
      agencyBlock: "AGENCY_STATE",
    });

    const core = rendered.indexOf("ONE ARBOR.");
    const selfModel = rendered.indexOf("CANONICAL_SELF_MODEL");
    const subsystem = rendered.indexOf("ACTIVE SUBSYSTEM: ARBOR.");
    const runtime = rendered.indexOf("RUNTIME_STATE");
    const agency = rendered.indexOf("AGENCY_STATE");

    expect(core).toBeGreaterThanOrEqual(0);
    expect(selfModel).toBeGreaterThan(core);
    expect(subsystem).toBeGreaterThan(selfModel);
    expect(runtime).toBeGreaterThan(subsystem);
    expect(agency).toBeGreaterThan(runtime);
    expect(rendered).toContain("clean copy-paste block by default");
  });

  it("keeps Annabelle downstream of the same canonical Arbor identity", () => {
    const rendered = composeArborSystemInjection({
      activeSubsystem: "annabelle",
      canonicalSelfModelBlock: "CANONICAL_SELF_MODEL",
      annabelleWorkspaceBlock: "ANNABELLE_WORKSPACE",
    });

    expect(rendered.indexOf("CANONICAL_SELF_MODEL")).toBeLessThan(
      rendered.indexOf("ACTIVE SUBSYSTEM: ANNABELLE."),
    );
    expect(rendered.indexOf("ACTIVE SUBSYSTEM: ANNABELLE.")).toBeLessThan(
      rendered.indexOf("ANNABELLE_WORKSPACE"),
    );
    expect(rendered).toContain("do not create a separate Annabelle identity");
  });
});
