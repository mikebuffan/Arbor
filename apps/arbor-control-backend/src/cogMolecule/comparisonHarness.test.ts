import { describe, expect, it } from "vitest";
import { compareRuntimes } from "./comparisonHarness.js";
import { LinearBaselineRuntime } from "./linearBaseline.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket, MoleculeResult } from "./types.js";

function packet(): CogPacket {
  return {
    id: "late-evidence-case",
    evidence: [],
    hypotheses: [],
    unresolved: ["late-evidence"],
    challenges: [],
    provenance: ["synthetic-diagnostic"],
    friction: 0,
    circulation: 0,
    metadata: {},
  };
}

function resolved(result: MoleculeResult): boolean {
  return result.disposition === "assert" && result.packet.unresolved.length === 0;
}

describe("linear versus recurrent comparison harness", () => {
  it("records a synthetic late-evidence diagnostic without hiding compute cost", async () => {
    const resolver: Cog = {
      id: "late-resolver",
      async process(current, context) {
        const next = structuredClone(current);
        if (context.round >= 2) next.unresolved = [];
        return { packet: next, reasons: [context.round >= 2 ? "resolved" : "waiting"] };
      },
    };

    const validate = async (current: CogPacket) => ({
      valid: current.unresolved.length === 0,
      reasons: [],
    });
    const project = async (current: CogPacket, reasons: string[]) => ({
      disposition: "assert" as const,
      packet: current,
      ordered: ["resolved"],
      provenance: current.provenance,
      confidence: 1,
      friction: current.friction,
      reasons,
    });

    const recurrent = new CogMoleculeRuntime({ cogs: [resolver], validate, project, maxRounds: 6 });
    const linear = new LinearBaselineRuntime({ cogs: [resolver], validate, project });
    const comparison = await compareRuntimes(recurrent, linear, [
      { id: "late-evidence", packet: packet(), correct: resolved },
    ]);

    expect(comparison.candidate.accuracy).toBe(1);
    expect(comparison.baseline.accuracy).toBe(0);
    expect(comparison.candidate.meanCompute).toBeGreaterThan(comparison.baseline.meanCompute);
    expect(comparison.candidateSamples[0].falseRelease).toBe(false);
    expect(comparison.baselineSamples[0].falseRelease).toBe(false);
  });
});
