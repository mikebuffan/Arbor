import { describe, expect, it } from "vitest";
import { buildProofSnapshot } from "../ProofSnapshot";

describe("Arbor proof snapshot", () => {
  it("carries the behavior proof used for the canonical turn", () => {
    const behavior = {
      schemaVersion: 1 as const,
      contractVersion: "test",
      mode: "voice" as const,
      coreFingerprint: "core",
      continuityFingerprint: "continuity",
      projectionFingerprint: "projection",
    };

    const snapshot = buildProofSnapshot({
      anchors: [],
      memoryItems: [],
      behavior,
    });

    expect(snapshot.behavior).toEqual(behavior);
  });
});
