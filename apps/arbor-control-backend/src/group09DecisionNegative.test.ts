import { describe, expect, it } from "vitest";
import {
  chooseExploration, completeCausalTrace, consolidate, observePrediction,
  rankCounterfactuals, type CuriosityCandidate,
} from "./cognitiveDynamics.js";
import { projectGlowNoise, type GlowOption } from "./glowNoiseDecision.js";

const scope = { userId: "fixture-owner", projectId: "fixture-project" };
const option = (id: string, changes: Partial<GlowOption> = {}): GlowOption => ({
  ...scope, id, label: `synthetic ${id}`,
  priority: "protect", prioritySource: "user-stated",
  expectedUtility: 0.8, evidenceConfidence: 0.8,
  reversible: true, blocked: false, evidenceRefs: [`fixture-review:${id}`],
  ...changes,
});
const choice = (items: GlowOption[]) => projectGlowNoise({ scope, options: items });
const explore = (id: string, changes: Partial<CuriosityCandidate> = {}): CuriosityCandidate => ({
  id, uncertainty: 0.9, relevance: 0.9, expectedInformationGain: 0.9, cost: 0.1,
  ...changes,
});

describe("Group 09 curiosity, priority and evidence negative controls", () => {
  it("chooses a lower-utility but grounded discriminator instead of malformed apparent information gain", () => {
    const result = chooseExploration([
      explore("bad-confidence", { expectedInformationGain: Number.POSITIVE_INFINITY }),
      explore("nan", { uncertainty: Number.NaN }),
      explore("bad-cost", { cost: -5 }),
      explore("out-of-bounds", { relevance: 3 }),
      explore("grounded", { expectedInformationGain: 0.5 }),
    ]);
    expect(result?.id).toBe("grounded");
  });

  it("holds duplicate/blank candidate identity, rather than manufacturing repeated independent options", () => {
    const candidates = [explore("dup"), explore("dup", { uncertainty: 0.8 }), explore("valid", { expectedInformationGain: 0.6 })];
    expect(chooseExploration(candidates)?.id).toBe("valid");
    expect(chooseExploration([explore(" ")] )).toBeNull();
    expect(chooseExploration([explore("valid")], Number.NaN)).toBeNull();
    expect(chooseExploration([explore("valid")], -1)).toBeNull();
  });

  it("does not explore irrelevant, prohibitively costly or zero-information uncertainty", () => {
    expect(chooseExploration([explore("rabbit-hole", { relevance: 0.02 })])).toBeNull();
    expect(chooseExploration([explore("cost", { cost: 1 })])).toBeNull();
    expect(chooseExploration([explore("no-new-info", { expectedInformationGain: 0 })])).toBeNull();
  });

  it("does not convert high confidence, lack of source, or unreviewed priority into executable Glow", () => {
    const view = choice([
      option("unsupported", { evidenceRefs: [], evidenceConfidence: 1 }),
      option("unreviewed", { prioritySource: "unreviewed" }),
      option("unknown", { priority: "unspecified" }),
      option("blocked", { blocked: true }),
      option("irreversible", { reversible: false }),
      option("optional", { priority: "optional", expectedUtility: 1 }),
      option("safe", { expectedUtility: 0.15 }),
    ]);
    expect(view.rankedReversibleGlowIds).toEqual(["safe"]);
    expect(view.review.map(x => x.id)).toEqual(["unsupported", "unreviewed", "unknown", "blocked", "irreversible"]);
    expect(view.noise.map(x => x.id)).toEqual(["optional"]);
    expect(view.valuesVerifiedHere).toBe(false);
    expect(view.evidenceVerifiedHere).toBe(false);
    expect(view.grantsExecution).toBe(false);
    expect(view.overridesHumanChoice).toBe(false);
  });

  it("rejects foreign scope and repeated priority IDs, not silently blending them", () => {
    expect(() => choice([option("foreign", { userId: "not-owner" })])).toThrow("glow_noise_scope_mismatch");
    expect(() => choice([option("duplicate"), option("duplicate")])).toThrow("glow_noise_duplicate_option");
  });

  it("a completed-looking causal explanation is not a verified observed consequence", () => {
    const trace = {
      eventId: "synthetic-event",
      internalStateChange: "uncertainty noted",
      attentionEffect: "question selected",
      expectationEffect: "expected to learn",
      interpretationEffect: "hypothesis retained",
      provenance: [""],
    };
    expect(completeCausalTrace(trace)).toBe(false);
    expect(completeCausalTrace({ ...trace, provenance: ["reviewed-source"] })).toBe(true);
    expect(consolidate([{ id: "bad", content: "claimed learning", durable: true, confidence: 1, provenance: [""] }])).toEqual([]);
    // Syntactically complete provenance never authenticates the underlying outcome.
  });

  it("records a prediction error without treating a single prediction as an authorized new choice", () => {
    const observed = observePrediction("synthetic", 0.9, 0.1);
    expect(observed.material).toBe(true);
    expect(observed.error).toBeLessThan(0);
    const suggestions = rankCounterfactuals([
      { id: "blocked", expectedUtility: 1, evidenceConfidence: 1, reversible: true, blocked: true },
      { id: "safe", expectedUtility: 0.4, evidenceConfidence: 0.7, reversible: true },
    ]);
    expect(suggestions.map(x => x.id)).toEqual(["safe"]);
    expect(observed).not.toHaveProperty("authorized");
  });
});
