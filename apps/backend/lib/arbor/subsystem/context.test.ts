import { describe, expect, it } from "vitest";
import { composeArborSystemInjection } from "./context";
import { renderCanonicalIdentityAnchor } from "../selfModel/canonicalIdentityAnchor";
import { ARBOR_OPERATING_SELF_MODEL_RULES, operatingSelfModelReceipt } from "../selfModel/operatingSelfModel";

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
});

describe("source-owned adaptive execution method, not a second planning engine", () => {
  const rule = "Groups → List → Prompt → Execute → Verify";
  it("reaches Arbor and Annabelle through the canonical self-model before subsystem rules", () => {
    const identity = renderCanonicalIdentityAnchor();
    const receipt = operatingSelfModelReceipt();
    expect(receipt.version).toBe("2026-10-10.3");
    expect(receipt.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(identity).toContain(rule);
    for (const activeSubsystem of ["arbor", "annabelle"] as const) {
      const result = composeArborSystemInjection({
        activeSubsystem, canonicalSelfModelBlock: identity, agencyBlock: "SYNTHETIC_AGENCY_STATE",
      });
      expect(result.indexOf(rule)).toBeGreaterThan(result.indexOf("ARBOR OPERATING SELF-MODEL"));
      expect(result.indexOf(rule)).toBeLessThan(result.indexOf("SYNTHETIC_AGENCY_STATE"));
      expect(result.indexOf(rule)).toBeLessThan(result.indexOf("ACTIVE SUBSYSTEM:"));
      expect(result.match(/Groups → List → Prompt → Execute → Verify/g)).toHaveLength(1);
    }
  });

  it("requires proportionate planning and evidence, never magic go or self-awarded learning", () => {
    const rules = ARBOR_OPERATING_SELF_MODEL_RULES.join(" ");
    expect(rules).toContain("answer simple requests directly");
    expect(rules).toContain("substantial multi-step work");
    expect(rules).toContain("execute safe authorized steps in the same run");
    expect(rules).toContain("dependencies and independent lanes");
    expect(rules).toContain("later, nonidentical task");
    expect(rules).toContain("redundant user go prompts");
    expect(rules).toContain("independently verified completion");
    expect(rules).toContain("Do not count a plan");
    expect(rules).not.toContain("automatically approve");
    expect(rules).not.toContain("autonomously deploy");
  });
});

describe("jigsaw reuse and connector-first operating rules", () => {
  it("loads the same source-owned strategy before Arbor and Annabelle task layers", () => {
    const identity = renderCanonicalIdentityAnchor();
    expect(identity).toContain("JIGSAW PRINCIPLE — REUSE BEFORE BUILD");
    expect(identity).toContain("CONNECTOR-FIRST PRIORITY");
    expect(identity).toContain("THE PILE OF NOPE");
    for (const activeSubsystem of ["arbor", "annabelle"] as const) {
      const injected = composeArborSystemInjection({ activeSubsystem, canonicalSelfModelBlock: identity });
      expect(injected.indexOf("CONNECTOR-FIRST PRIORITY")).toBeLessThan(
        injected.indexOf("ACTIVE SUBSYSTEM:"));
      expect(injected.match(/THE PILE OF NOPE/g)).toHaveLength(1);
    }
  });
  it("chooses high-leverage existing prerequisites without granting authority or making busywork", () => {
    const rules = ARBOR_OPERATING_SELF_MODEL_RULES.join(" ");
    expect(rules).toContain("shared bridges and prerequisites");
    expect(rules).toContain("several real dependent tasks");
    expect(rules).toContain("owner permissions, risk, reversibility and cost");
    expect(rules).toContain("does not exist");
    expect(rules).toContain("Deferred is not discarded");
    expect(rules).toContain("may not silently expand the active job");
    expect(rules).toContain("a new planner");
  });
});
