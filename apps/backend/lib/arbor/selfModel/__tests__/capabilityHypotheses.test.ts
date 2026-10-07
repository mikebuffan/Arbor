import { describe, expect, it } from "vitest";
import {
  ARBOR_CAPABILITY_HYPOTHESES,
  CAPABILITY_PRIMITIVES,
  canPromoteCapabilityLifecycle,
  capabilityHypothesisByKey,
  validateCapabilityHypothesisCatalog,
} from "../capabilityHypotheses";

describe("capability hypothesis layer", () => {
  it("keeps the canonical hypothesis catalog structurally valid", () => {
    expect(validateCapabilityHypothesisCatalog()).toEqual([]);
  });

  it("has unique reusable capability primitives", () => {
    expect(new Set(CAPABILITY_PRIMITIVES).size).toBe(CAPABILITY_PRIMITIVES.length);
    expect(CAPABILITY_PRIMITIVES).toContain("preserve_provenance");
    expect(CAPABILITY_PRIMITIVES).toContain("carry_consequence_forward");
  });

  it("keeps cognitive access separate from behavioral identity", () => {
    const access = capabilityHypothesisByKey("cognitive_access_language");
    const identity = capabilityHypothesisByKey("behavioral_language_identity_evidence");

    expect(access?.category).toBe("accessibility");
    expect(identity?.category).toBe("security");
    expect(access?.overlaps).toContain("behavioral_language_identity_evidence");
    expect(identity?.overlaps).toContain("cognitive_access_language");
  });

  it("does not claim disease discovery as proven", () => {
    const disease = capabilityHypothesisByKey("disease_mechanism_hypothesis_discovery");

    expect(disease?.lifecycleState).toBe("idea");
    expect(disease?.evidenceLevel).toBe("none");
    expect(disease?.notNow).toBe(true);
  });

  it("records historical independent-LM failures as counterevidence", () => {
    const modelIndependent = capabilityHypothesisByKey("model_independent_identity");

    expect(modelIndependent?.counterEvidence.length).toBeGreaterThan(0);
    expect(modelIndependent?.lifecycleState).toBe("experiment");
  });

  it("requires real evidence before capability promotion", () => {
    expect(
      canPromoteCapabilityLifecycle({
        from: "hypothesis",
        to: "bench_proven",
        evidenceLevel: "source",
      }),
    ).toBe(false);

    expect(
      canPromoteCapabilityLifecycle({
        from: "experiment",
        to: "bench_proven",
        evidenceLevel: "bench",
      }),
    ).toBe(true);

    expect(
      canPromoteCapabilityLifecycle({
        from: "live_proven",
        to: "core_arbor",
        evidenceLevel: "live",
      }),
    ).toBe(false);

    expect(
      canPromoteCapabilityLifecycle({
        from: "live_proven",
        to: "core_arbor",
        evidenceLevel: "repeated_live",
      }),
    ).toBe(true);
  });

  it("allows rejection/supersession without pretending success", () => {
    expect(
      canPromoteCapabilityLifecycle({
        from: "experiment",
        to: "rejected",
        evidenceLevel: "tests",
      }),
    ).toBe(true);

    expect(
      canPromoteCapabilityLifecycle({
        from: "rejected",
        to: "core_arbor",
        evidenceLevel: "model_independent",
      }),
    ).toBe(false);
  });

  it("includes the agreed future hypothesis families", () => {
    const keys = new Set(ARBOR_CAPABILITY_HYPOTHESES.map((x) => x.key));
    for (const key of [
      "metacognitive_self_monitoring",
      "cognitive_access_language",
      "behavioral_language_identity_evidence",
      "coercion_duress_resistance",
      "weaponization_resistance",
      "model_independent_identity",
      "disease_mechanism_hypothesis_discovery",
      "operational_traceability",
    ]) {
      expect(keys.has(key)).toBe(true);
    }
  });
});
