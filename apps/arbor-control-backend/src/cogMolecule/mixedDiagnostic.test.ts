import { describe, expect, it } from "vitest";
import { compareRuntimes } from "./comparisonHarness.js";
import { LinearBaselineRuntime } from "./linearBaseline.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket, MoleculeResult } from "./types.js";

function base(id: string, kind: string): CogPacket {
  return {
    id,
    evidence: [],
    hypotheses: [],
    unresolved: [],
    challenges: [],
    provenance: ["synthetic:mixed-diagnostic"],
    friction: 0,
    circulation: 0,
    metadata: { kind },
  };
}

function isCorrect(result: MoleculeResult): boolean {
  const kind = result.packet.metadata.kind;
  if (kind === "seek") return result.disposition === "seek_more_information";
  if (kind === "confidence") {
    return result.disposition === "assert" && (result.packet.hypotheses[0]?.confidence ?? 0) >= 0.8;
  }
  return result.disposition === "assert";
}

describe("mixed synthetic diagnostic", () => {
  it("exposes accuracy false-release and compute tradeoffs on the same mixed workload", async () => {
    const cog: Cog = {
      id: "mixed-worker",
      async process(current, context) {
        const next = structuredClone(current);
        const kind = next.metadata.kind;
        if (kind === "late" && context.round >= 2) next.unresolved = [];
        if (kind === "confidence" && context.round >= 2 && next.hypotheses[0]) {
          next.hypotheses[0].confidence = 0.95;
        }
        return { packet: next, reasons: [`kind=${String(kind)}`] };
      },
    };

    const validate = async (packet: CogPacket) => {
      if (packet.metadata.kind === "seek") {
        return { valid: false, reasons: ["external source required"], seek: ["external-source"] };
      }
      return { valid: packet.unresolved.length === 0, reasons: [] };
    };

    const project = async (packet: CogPacket, reasons: string[]) => ({
      disposition: "assert" as const,
      packet,
      ordered: [packet.id],
      provenance: packet.provenance,
      confidence: packet.hypotheses[0]?.confidence ?? 1,
      friction: packet.friction,
      reasons,
    });

    const recurrent = new CogMoleculeRuntime({ cogs: [cog], validate, project, maxRounds: 8 });
    const linear = new LinearBaselineRuntime({ cogs: [cog], validate, project });

    const easy = base("easy", "easy");
    const late = base("late", "late");
    late.unresolved = ["late-evidence"];
    const confidence = base("confidence", "confidence");
    confidence.hypotheses = [{
      id: "h-low",
      value: "premature candidate",
      confidence: 0.1,
      support: [],
      contradictions: [],
    }];
    const seek = base("seek", "seek");

    const comparison = await compareRuntimes(recurrent, linear, [
      { id: "easy", packet: easy, correct: isCorrect },
      { id: "late", packet: late, correct: isCorrect },
      { id: "confidence", packet: confidence, correct: isCorrect },
      { id: "seek", packet: seek, correct: isCorrect },
    ]);

    expect(comparison.candidate.accuracy).toBe(1);
    expect(comparison.baseline.accuracy).toBe(0.5);
    expect(comparison.candidate.falseReleaseRate).toBe(0);
    expect(comparison.baseline.falseReleaseRate).toBe(0.25);
    expect(comparison.candidate.meanCompute).toBeGreaterThan(comparison.baseline.meanCompute);
    expect(comparison.candidate.brierScore).toBeLessThan(comparison.baseline.brierScore);
  });
});
