import { describe, expect, it } from "vitest";
import { composeArborSystemInjection } from "./context";

describe("canonical Arbor injection ordering", () => {
  it("keeps canonical identity and state upstream of task subsystem projection", () => {
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
    expect(runtime).toBeGreaterThan(selfModel);
    expect(agency).toBeGreaterThan(runtime);
    expect(subsystem).toBeGreaterThan(agency);
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

  it("keeps intimate scene craft in Annabelle only, after canonical identity", () => {
    const annabelle = composeArborSystemInjection({
      activeSubsystem: "annabelle",
      canonicalSelfModelBlock: "CANONICAL_SELF_MODEL",
      annabelleWorkspaceBlock: "SCOPED_ANNABELLE_WORKSPACE",
    });
    const arbor = composeArborSystemInjection({
      activeSubsystem: "arbor",
      canonicalSelfModelBlock: "CANONICAL_SELF_MODEL",
    });
    const cue = "ANNABELLE — ADULT INTIMACY / SEXUAL FELT-LIFE SCENE CRAFT";
    expect(annabelle).toContain(cue);
    expect(annabelle.indexOf("CANONICAL_SELF_MODEL")).toBeLessThan(
      annabelle.indexOf(cue),
    );
    expect(annabelle.indexOf(cue)).toBeLessThan(
      annabelle.indexOf("SCOPED_ANNABELLE_WORKSPACE"),
    );
    expect(annabelle).toContain("prior assent");
    expect(annabelle).toContain("STOP ends the interaction");
    expect(annabelle).toContain("not permission for autonomous manuscript edits");
    expect(arbor).not.toContain(cue);
    expect(arbor).toContain("ACTIVE SUBSYSTEM: ARBOR.");
  });

});
