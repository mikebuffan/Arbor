import { describe, expect, it } from "vitest";
import { arkAgencyPlanId } from "../agencyPlanId";

describe("ARK agency plan id", () => {
  it("is stable for equivalent object key order and stays inside DB bounds", () => {
    const a = arkAgencyPlanId({
      turnId: "turn-1",
      toolName: "state.write",
      args: { b: 2, a: 1 },
    });
    const b = arkAgencyPlanId({
      turnId: "turn-1",
      toolName: "state.write",
      args: { a: 1, b: 2 },
    });

    expect(a).toBe(b);
    expect(a).toMatch(/^ark:[a-f0-9]{64}$/);
    expect(a.length).toBeLessThanOrEqual(200);
  });

  it("does not expand with very large tool arguments", () => {
    const id = arkAgencyPlanId({
      turnId: "turn-1",
      toolName: "arbor_pattern_hop_research",
      args: { seed: "x".repeat(4000), objective: "y".repeat(4000) },
    });

    expect(id.length).toBe(68);
  });
});
