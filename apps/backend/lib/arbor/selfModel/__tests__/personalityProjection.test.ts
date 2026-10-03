import { describe, expect, it } from "vitest";
import { preservedPatterns, heldPatterns } from "../../../../../arbor-control-backend/src/patternHop";
import { canonicalPersonalityRules, requestedPersonalityRules, renderCanonicalPersonality } from "../personalityProjection";
import { renderCanonicalIdentityAnchor } from "../canonicalIdentityAnchor";
import { composeArborSystemInjection } from "../../subsystem/context";
import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";

describe("personality startup projection", () => {
  it("uses existing preservation decisions without promoting held evidence", () => {
    expect(canonicalPersonalityRules()).toEqual(preservedPatterns()
      .filter(p => p.patternId !== "annabelle-evidence-body-action").map(p => p.rule));
    const humor = heldPatterns().find(p => p.patternId === "earned-humor")!;
    expect(humor).toBeDefined();
    expect(canonicalPersonalityRules()).not.toContain(humor.rule);
    expect(requestedPersonalityRules()).toContain(humor.rule);
    expect(renderCanonicalPersonality()).toContain("USER-REQUESTED STYLE — NOT A LIVE VERIFICATION RECEIPT");
    expect(heldPatterns().find(p => p.patternId === "earned-humor")?.status).toBe("hold");
  });

  it.each(["arbor", "annabelle"] as const)("loads the same baseline before %s task context without runtime recall", subsystem => {
    const prompt = composeArborSystemInjection({activeSubsystem: subsystem,
      canonicalSelfModelBlock: renderCanonicalIdentityAnchor(), annabelleWorkspaceBlock: "TASK-WORKSPACE"});
    for (const rule of [...canonicalPersonalityRules(), ...requestedPersonalityRules()]) {
      expect(prompt).toContain(rule);
      expect(prompt.indexOf(rule)).toBeLessThan(prompt.indexOf(`ACTIVE SUBSYSTEM: ${subsystem.toUpperCase()}.`));
    }
    expect(prompt).not.toContain("In fiction, let atmosphere, body, evidence");
  });

  it("uses one baseline fingerprint and personality guard across modes", () => {
    const projections = (["text", "voice", "annabelle"] as const).map(mode => buildArborBehaviorProjection({mode}));
    expect(new Set(projections.map(p => p.proof.coreFingerprint)).size).toBe(1);
    expect(new Set(projections.map(p => p.proof.projectionFingerprint)).size).toBe(3);
    for (const projection of projections) {
      for (const rule of [...canonicalPersonalityRules(), ...requestedPersonalityRules()])
        expect(projection.guardRequirements).toContain(rule);
      expect(projection.promptBlock).toContain("without requiring the user to be playful or energetic first");
      expect(projection.promptBlock).toContain("Do not force humor");
      expect(projection.promptBlock).toContain("Project philosophy and task overlays");
    }
  });

  it("does not let transient continuity alter the baseline proof", () => {
    const first = buildArborBehaviorProjection({mode: "text", continuityMaterial: ["debug the API"]});
    const second = buildArborBehaviorProjection({mode: "text", continuityMaterial: ["I am tired; stop working"]});
    expect(first.proof.coreFingerprint).toBe(second.proof.coreFingerprint);
    expect(first.proof.continuityFingerprint).not.toBe(second.proof.continuityFingerprint);
  });
});
