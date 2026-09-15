import { describe, expect, it } from "vitest";
import {
  buildRerouteInstruction,
  isExplicitRetrievalRejection,
  rejectRetrievalNeighborhood,
  rerankAfterRejection,
} from "../retrievalReroute";

describe("retrieval reroute", () => {
  it("recognizes explicit rejection without treating ordinary disagreement as memory truth", () => {
    expect(isExplicitRetrievalRejection("This must not be the right thread.")).toBe(true);
    expect(isExplicitRetrievalRejection("No. We were talking about fixing the system.")).toBe(true);
    expect(isExplicitRetrievalRejection("I disagree with that policy.")).toBe(false);
  });

  it("suppresses a rejected semantic neighborhood and promotes a materially different cue match", () => {
    const state = rejectRetrievalNeighborhood({
      selected: [
        { key: "philosophy.free_will", text: "free will moral choice evil philosophy", score: 0.91 },
        { key: "arbor.moral_agency", text: "Arbor free will agency moral architecture", score: 0.88 },
      ],
    });

    const ranked = rerankAfterRejection({
      state,
      currentCue: "Epstein files evidence packet pattern hop trusted investigator",
      candidates: [
        { key: "philosophy.free_will", text: "free will moral choice evil philosophy", score: 0.93 },
        { key: "system.evidence_packet", text: "Epstein files public records evidence packet trusted investigator pattern hop", score: 0.74 },
      ],
    });

    expect(ranked[0].key).toBe("system.evidence_packet");
    expect(ranked[ranked.length - 1].key).toBe("philosophy.free_will");
  });

  it("instructs the model to abandon rather than rationalize a rejected hypothesis", () => {
    const state = rejectRetrievalNeighborhood({
      selected: [{ key: "wrong", text: "wrong neighborhood", score: 1 }],
    });
    const instruction = buildRerouteInstruction(state);

    expect(instruction).toContain("explicitly rejected");
    expect(instruction).toContain("suppress that neighborhood");
    expect(instruction).toContain("pattern-hop");
    expect(instruction).toContain("rather than fabricating continuity");
  });
});
