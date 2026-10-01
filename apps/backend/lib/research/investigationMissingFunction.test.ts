import { describe, expect, it } from "vitest";
import { inferMissingFunction } from "./investigationMissingFunction";

describe("missing-function inference", () => {
  it("creates an anonymous functional placeholder instead of inventing a person", () => {
    const lead = inferMissingFunction({
      id: "gap:schedule-to-travel",
      upstreamEntityIds: ["calendar:event"],
      downstreamEntityIds: ["travel:record"],
      observedTransition:
        "A scheduled appearance is followed by travel logistics, but no routing record connects them.",
      requiredCapabilities: ["coordinate itinerary", "transmit travel details"],
      evidenceRefs: ["calendar:1", "travel:1"],
      lineageKeys: ["lineage:calendar", "lineage:travel"],
    });

    expect(lead.status).toBe("unknown_function_hypothesis");
    expect(lead.placeholderNodeId).toContain("UNKNOWN_FUNCTION");
    expect(lead.functionalRole).toContain("coordinate itinerary");
    expect(lead.note).toContain("does not invent or identify a person");
  });

  it("includes a direct/no-intermediary falsifier in its search targets", () => {
    const lead = inferMissingFunction({
      id: "gap:1",
      upstreamEntityIds: ["a"],
      downstreamEntityIds: ["b"],
      observedTransition: "A to B",
      requiredCapabilities: ["relay information"],
      evidenceRefs: ["e1"],
      lineageKeys: ["l1"],
    });

    expect(lead.searchTargets.some((target) =>
      target.includes("no intermediary was required")
    )).toBe(true);
  });
});
