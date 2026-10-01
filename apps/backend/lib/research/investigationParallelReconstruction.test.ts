import { describe, expect, it } from "vitest";
import { compareParallelReconstructions } from "./investigationParallelReconstruction";

describe("parallel blind reconstruction comparison", () => {
  it("finds convergence across isolated analytic lenses without calling it independent evidence", () => {
    const result = compareParallelReconstructions({
      reconstructions: [
        {
          lens: "chronology",
          events: [{
            eventKey: "event:x",
            evidenceRefs: ["e1", "e2"],
            entityIds: ["entity:a"],
          }],
        },
        {
          lens: "money",
          events: [{
            eventKey: "event:x",
            evidenceRefs: ["e2", "e3"],
            entityIds: ["entity:a"],
          }],
        },
      ],
    });

    expect(result[0]).toMatchObject({
      eventKey: "event:x",
      status: "cross_lens_convergence",
      lenses: ["chronology", "money"],
    });
    expect(result[0].note).toContain("not independent evidentiary corroboration");
  });

  it("keeps a one-lens event as a one-lens interpretation", () => {
    const result = compareParallelReconstructions({
      reconstructions: [
        {
          lens: "chronology",
          events: [{
            eventKey: "event:x",
            evidenceRefs: ["e1"],
            entityIds: ["entity:a"],
          }],
        },
        {
          lens: "logistics",
          events: [{
            eventKey: "event:y",
            evidenceRefs: ["e2"],
            entityIds: ["entity:b"],
          }],
        },
      ],
    });

    expect(result.every((item) => item.status === "single_lens")).toBe(true);
  });

  it("rejects duplicate lenses because the reconstructions are supposed to be isolated perspectives", () => {
    expect(() => compareParallelReconstructions({
      reconstructions: [
        { lens: "money", events: [] },
        { lens: "money", events: [] },
      ],
    })).toThrow("parallel_reconstruction_duplicate_lens");
  });
});
