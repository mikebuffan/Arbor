import { describe, expect, it } from "vitest";
import { AdaptiveComputePolicy } from "./adaptiveCompute.js";

describe("AdaptiveComputePolicy", () => {
  it("keeps easy material cheap and escalates high friction selectively", () => {
    const policy = new AdaptiveComputePolicy();
    expect(policy.decide(0.05).maxRounds).toBe(4);
    expect(policy.decide(0.3).maxRounds).toBe(12);
    expect(policy.decide(0.55).maxRounds).toBe(32);
    expect(policy.decide(0.9).maxRounds).toBe(64);
  });

  it("does not escalate every packet to the maximum budget", () => {
    const policy = new AdaptiveComputePolicy();
    const budgets = [0.02, 0.08, 0.18, 0.31, 0.49, 0.76].map((f) => policy.decide(f).maxRounds);
    expect(budgets.filter((budget) => budget === 64)).toHaveLength(1);
    expect(budgets[0]).toBeLessThan(budgets[budgets.length - 1]);
  });
});