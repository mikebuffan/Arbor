import { describe, expect, it } from "vitest";
import { projectGlowNoise, type GlowOption } from "./glowNoiseDecision.js";
const scope = { userId: "owner", projectId: "project" };
const option = (id: string, changes: Partial<GlowOption> = {}): GlowOption => ({
  ...scope, id, label: "synthetic choice " + id,
  priority: "protect", prioritySource: "user-stated",
  expectedUtility: 0.8, evidenceConfidence: 0.8,
  reversible: true, blocked: false, evidenceRefs: ["owner-decision:" + id],
  ...changes,
});
const view = (options: GlowOption[]) => projectGlowNoise({ scope, options });

describe("Glow vs Noise sourced decisions", () => {
  it("protects explicitly prioritized reversible options via existing ranking, without executing", () => {
    const result = view([
      option("a", { expectedUtility: 0.8 }),
      option("b", { expectedUtility: 0.9 }),
    ]);
    expect(result.glow.map(x => x.id)).toEqual(["a", "b"]);
    expect(result.rankedReversibleGlowIds).toEqual(["b", "a"]);
    expect(result.grantsExecution).toBe(false);
    expect(result.valuesVerifiedHere).toBe(false);
    expect(result.evidenceVerifiedHere).toBe(false);
    expect(result.determinesHumanCapacity).toBe(false);
    expect(result.overridesHumanChoice).toBe(false);
  });

  it("never turns high utility into Glow when user explicitly called an item optional", () => {
    const result = view([
      option("optional", { priority: "optional", expectedUtility: 1 }),
      option("protect", { expectedUtility: 0.4 }),
    ]);
    expect(result.noise.map(x => x.id)).toEqual(["optional"]);
    expect(result.glow.map(x => x.id)).toEqual(["protect"]);
    expect(result.rankedReversibleGlowIds).toEqual(["protect"]);
  });

  it("holds undefined and unreviewed priorities instead of inferring values", () => {
    const result = view([
      option("unknown", { priority: "unspecified", expectedUtility: 1 }),
      option("unreviewed", { prioritySource: "unreviewed" }),
    ]);
    expect(result.glow).toHaveLength(0);
    expect(result.noise).toHaveLength(0);
    expect(result.review.map(x => x.reason)).toEqual([
      "unspecified_priority", "unreviewed_priority",
    ]);
  });

  it("flags explicit irreversible/blocked priorities as human forks without ranking", () => {
    const result = view([
      option("irreversible", { reversible: false, expectedUtility: 1 }),
      option("blocked", { blocked: true }),
      option("safe", { expectedUtility: 0.1 }),
    ]);
    expect(result.glow.map(x => x.id)).toEqual([
      "irreversible", "blocked", "safe",
    ]);
    expect(result.rankedReversibleGlowIds).toEqual(["safe"]);
    expect(result.review.map(x => x.id)).toEqual(["irreversible", "blocked"]);
    expect(result.hasIrreversibleFork).toBe(true);
    expect(result.grantsExecution).toBe(false);
  });

  it("does not accept confidence without actual scoped source reference", () => {
    const result = view([
      option("no-ref", { evidenceRefs: [], evidenceConfidence: 1 }),
      option("no-confidence", { evidenceConfidence: 0 }),
    ]);
    expect(result.glow).toEqual([]);
    expect(result.review.every(x => x.reason === "missing_evidence")).toBe(true);
  });

  it("rejects foreign project and foreign user options rather than silently filtering", () => {
    expect(() => view([option("foreign", { projectId: "other" })]))
      .toThrow("glow_noise_scope_mismatch");
    expect(() => view([option("foreign", { userId: "other" })]))
      .toThrow("glow_noise_scope_mismatch");
  });

  it("rejects duplicate IDs, oversized arrays and invalid numbers", () => {
    expect(() => view([option("same"), option("same")]))
      .toThrow("glow_noise_duplicate_option");
    expect(() => view(Array.from({ length: 25 }, (_, n) =>
      option("id-" + n)))).toThrow("glow_noise_input_invalid");
    expect(() => view([option("nan", { expectedUtility: NaN })]))
      .toThrow("glow_noise_option_invalid");
    expect(() => view([option("too-high", { evidenceConfidence: 1.1 })]))
      .toThrow("glow_noise_option_invalid");
  });

  it("is deterministic and does not mutate candidate options", () => {
    const options = [
      option("first"), option("second", { priority: "optional" }),
    ];
    const prior = structuredClone(options);
    expect(view(options)).toEqual(view(options));
    expect(options).toEqual(prior);
  });
});

it.each([{ evidenceRefs: new Array<string>(1) }, { evidenceRefs: Object.assign(new Array<string>(2), { 0: "source" }) }])(
  "rejects sparse evidence arrays instead of ranking an unsourced priority", ({ evidenceRefs }) => {
    expect(() => view([option("sparse", { evidenceRefs })])).toThrow("glow_noise_option_invalid");
  },
);
