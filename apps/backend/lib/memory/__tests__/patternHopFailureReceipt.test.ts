import { describe, expect, it } from "vitest";
import { patternHopSourceFailureReceipt } from "../patternHopResearch";

describe("Pattern Hop durable source failures stay content-free", () => {
  it("marks partial source failure without including arbitrary provider messages", () => {
    expect(patternHopSourceFailureReceipt(["historical"]))
      .toBe("some_pattern_hop_sources_failed:historical");
    expect(patternHopSourceFailureReceipt(["memory","timeline"]))
      .toBe("some_pattern_hop_sources_failed:memory|timeline");
  });
  it("marks all unavailable sources while retaining prior retry blocker shape", () => {
    expect(patternHopSourceFailureReceipt(["historical","memory","timeline"]))
      .toBe("all_pattern_hop_sources_failed:historical|memory|timeline");
  });
  it("never accepts a possible driver error as a durable source label", () => {
    expect(() => patternHopSourceFailureReceipt(["historical:PRIVATE-CONTENT"] as never))
      .toThrow("pattern_hop_invalid_failure_sources");
    expect(() => patternHopSourceFailureReceipt([]))
      .toThrow("pattern_hop_invalid_failure_sources");
  });
});
