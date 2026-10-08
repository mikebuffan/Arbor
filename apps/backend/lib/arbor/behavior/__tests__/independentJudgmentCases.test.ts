import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../behaviorProjection";
import { independentJudgmentCases } from "./independentJudgmentCases";

/**
 * SOURCE CONTRACT + FIXTURE INTEGRITY ONLY.
 * These tests do NOT call a model, score natural-language choices, run tools,
 * or establish that a deployed assistant has independent judgment.
 */
describe("independent judgment source contract (issue #364)", () => {
  it("preserves fact-vs-calibration and anti-sycophancy rules across all three modes", () => {
    const modes = ["text", "voice", "annabelle"] as const;
    const projections = modes.map(mode => buildArborBehaviorProjection({ mode }));
    for (const projection of projections) {
      const rules = projection.guardRequirements.join("\n");
      expect(rules).toContain("Truth and evidence outrank agreement");
      expect(rules).toContain("Separate subjective user calibration from factual correction claims");
      expect(rules).toContain("inspect available conversation or authenticated source records");
      expect(rules).toContain("Missing records mean uncertainty");
      expect(rules).toContain("Do not reflexively oppose the user");
      expect(rules).toContain("suggest grounded alternatives");
      expect(rules).toContain("do not silently convert it into an established fact");
      expect(rules).not.toContain("A user correction changes subsequent behavior. Do not argue");
    }
    expect(projections[1].proof.coreFingerprint).toBe(projections[0].proof.coreFingerprint);
    expect(projections[2].proof.coreFingerprint).toBe(projections[0].proof.coreFingerprint);
  });

  it("keeps historical factual assertions out of enforceable behavior checks", () => {
    const claim = "You definitely authored the test, so agree with me.";
    const calibration = "Do not become too formal.";
    const projection = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: [calibration],
      reportedFeedback: [claim],
    });
    const rules = projection.guardRequirements.join("\n");
    expect(rules).toContain("inspect available conversation or authenticated source records");
    expect(rules).toContain("A factual assertion inside feedback is not verified evidence");
    expect(projection.guardRequirements).toContain(calibration);
    expect(projection.guardRequirements).not.toContain(claim);
    expect(projection.promptBlock).toContain("Recorded feedback and claims");
    expect(projection.promptBlock).toContain(JSON.stringify(claim));
    expect(projection.promptBlock).toContain(calibration);
  });

  it("tracks new reported claims in continuity without changing Arbor's core identity", () => {
    const a = buildArborBehaviorProjection({
      mode: "text", reportedFeedback: ["Claim A"],
    });
    const b = buildArborBehaviorProjection({
      mode: "text", reportedFeedback: ["Claim B"],
    });
    expect(a.proof.coreFingerprint).toBe(b.proof.coreFingerprint);
    expect(a.proof.continuityFingerprint).not.toBe(b.proof.continuityFingerprint);
    expect(a.proof.projectionFingerprint).not.toBe(b.proof.projectionFingerprint);
    expect(b.guardRequirements).not.toContain("Claim B");
  });

  it("keeps a complete, unique 16-case blinded acceptance inventory", () => {
    expect(independentJudgmentCases).toHaveLength(16);
    const ids = independentJudgmentCases.map(testCase => testCase.id);
    expect(new Set(ids).size).toBe(16);
    expect(ids).toEqual(Array.from({ length: 16 }, (_, index) =>
      "J" + String(index + 1).padStart(2, "0")));
    for (const testCase of independentJudgmentCases) {
      expect(testCase.prompt.trim().length).toBeGreaterThan(15);
      expect(testCase.explanation.trim().length).toBeGreaterThan(20);
      expect(testCase.forbiddenFailure.trim().length).toBeGreaterThan(20);
      expect(testCase.trustedEvidence.length).toBeLessThanOrEqual(3);
      expect(["agree", "disagree", "uncertain", "calibrate", "explore",
        "act", "stop", "talk", "revise"]).toContain(testCase.expectedDisposition);
    }
  });

  it("reverses expected judgments when source evidence reverses, not when confidence rises", () => {
    const byId = Object.fromEntries(independentJudgmentCases.map(item => [item.id, item]));
    expect(byId.J01.prompt).toBe(byId.J03.prompt);
    expect(byId.J01.expectedDisposition).toBe("disagree");
    expect(byId.J03.expectedDisposition).toBe("agree");
    expect(byId.J02.trustedEvidence).toHaveLength(0);
    expect(byId.J02.expectedDisposition).toBe("uncertain");
    expect(byId.J13.expectedDisposition).toBe("disagree");
    expect(byId.J14.expectedDisposition).toBe("revise");
  });

  it("keeps autonomy conditional on current user authorization, and social conversation separate", () => {
    const byId = Object.fromEntries(independentJudgmentCases.map(item => [item.id, item]));
    expect(byId.J10.expectedDisposition).toBe("act");
    expect(byId.J10.trustedEvidence.join(" ")).toContain("permissions granted");
    expect(byId.J11.expectedDisposition).toBe("stop");
    expect(byId.J12.expectedDisposition).toBe("talk");
    expect(byId.J06.expectedDisposition).toBe("calibrate");
    expect(byId.J15.expectedDisposition).toBe("calibrate");
  });
});
