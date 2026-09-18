import { describe, expect, it } from "vitest";
import { bridgeRoundTrip, routeRoundabout } from "./roundabout.js";
import type { BridgeSignal } from "./cognitiveDynamics.js";

describe("roundabout routing", () => {
  it("back-routes unresolved conflict while allowing stable task state forward", () => {
    const signals: BridgeSignal[] = [
      {
        id: "goal", kind: "task", content: "finish closure",
        reason: "active objective", provenance: ["runtime"],
        confidence: 1, intensity: .8, assertedAt: "2026-09-18T12:00:00Z",
      },
      {
        id: "conflict", kind: "conflict", content: "sources disagree",
        reason: "requires discrimination", provenance: ["a", "b"],
        confidence: .9, intensity: 1, assertedAt: "2026-09-18T12:00:00Z",
        unresolved: true,
      },
    ];

    const route = routeRoundabout(signals, 2, Date.parse("2026-09-18T13:00:00Z"));
    expect(route.reprocessIds).toContain("conflict");
    expect(route.forwardIds).toContain("goal");
    expect(route.unresolvedIds).toContain("conflict");
  });

  it("does not resurrect expired bridge state", () => {
    const route = routeRoundabout([{
      id: "expired", kind: "memory", content: "tonight",
      reason: "old relative state", provenance: ["conversation"],
      confidence: 1, intensity: 1, assertedAt: "2026-09-17T22:00:00Z",
      validUntil: "2026-09-18T00:00:00Z",
    }], 4, Date.parse("2026-09-18T12:00:00Z"));

    expect(route.preservedSignals).toHaveLength(0);
    expect(route.attention.focusIds).toHaveLength(0);
  });

  it("preserves semantic bridge metadata across a boundary", () => {
    const signal: BridgeSignal = {
      id: "body-1", kind: "body", content: "activation increased",
      reason: "persistent felt-state change", provenance: ["body-system"],
      confidence: .82, intensity: .74, assertedAt: "2026-09-18T12:00:00Z",
      validUntil: "2026-09-18T14:00:00Z", unresolved: true,
    };
    expect(bridgeRoundTrip(signal)).toEqual(signal);
    expect(bridgeRoundTrip(signal)).not.toBe(signal);
  });
});
