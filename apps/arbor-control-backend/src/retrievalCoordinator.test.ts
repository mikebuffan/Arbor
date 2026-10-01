import { describe, expect, it, vi } from "vitest";
import { flattenedProvenance, runTieredRetrieval } from "./retrievalCoordinator.js";

describe("tiered retrieval coordinator", () => {
  it("escalates only until evidence is sufficient", async () => {
    const retrieve = vi.fn(async (tier) => ({
      tier,
      items: [tier],
      provenance: [`source:${tier}`],
      sufficient: tier === "structured-index",
    }));

    const run = await runTieredRetrieval(retrieve);
    expect(run.attempted).toEqual(["hot-state", "structured-index"]);
    expect(run.sufficient).toBe(true);
    expect(retrieve).toHaveBeenCalledTimes(2);
  });

  it("reaches Pattern Hop before raw archive and preserves provenance", async () => {
    const run = await runTieredRetrieval(async (tier) => ({
      tier,
      items: [{ tier }],
      provenance: [`p:${tier}`],
      sufficient: tier === "pattern-hop",
    }));

    expect(run.attempted).toEqual([
      "hot-state",
      "structured-index",
      "pattern-hop",
    ]);
    expect(run.attempted).not.toContain("raw-archive");
    expect(flattenedProvenance(run)).toEqual([
      "p:hot-state",
      "p:structured-index",
      "p:pattern-hop",
    ]);
  });

  it("uses raw archive only as the final fallback", async () => {
    const run = await runTieredRetrieval(async (tier) => ({
      tier,
      items: [],
      provenance: [],
      sufficient: false,
    }));

    expect(run.attempted).toEqual([
      "hot-state",
      "structured-index",
      "pattern-hop",
      "raw-archive",
    ]);
    expect(run.sufficient).toBe(false);
  });
});
