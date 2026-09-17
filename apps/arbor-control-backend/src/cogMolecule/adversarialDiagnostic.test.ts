import { describe, expect, it } from "vitest";
import { compareRuntimes } from "./comparisonHarness.js";
import { LinearBaselineRuntime } from "./linearBaseline.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket, MoleculeResult } from "./types.js";

type Expected = "assert" | "seek_more_information" | "abstain";

function packet(id: string, scenario: string, expected: Expected): CogPacket {
  return {
    id,
    evidence: [],
    hypotheses: [],
    unresolved: [],
    challenges: [],
    provenance: [`torture:${scenario}`],
    friction: 0,
    circulation: 0,
    metadata: { scenario, expected },
  };
}

function correct(result: MoleculeResult): boolean {
  return result.disposition === result.packet.metadata.expected;
}

describe("adversarial evidence torture diagnostic", () => {
  it("tests late evidence, contradiction, provenance, unsupported claims, and association-vs-culpability", async () => {
    const cog: Cog = {
      id: "evidence-worker",
      async process(current, context) {
        const next = structuredClone(current);
        const scenario = String(next.metadata.scenario);

        if (scenario === "late-evidence" && context.round >= 2) {
          next.evidence.push({ id: "late-source", value: "corroborated", provenance: ["source:late"], confidence: 0.95 });
          next.unresolved = [];
        }

        if (scenario === "contradiction" && context.round >= 2) {
          next.challenges = next.challenges.map((challenge) => ({ ...challenge, resolved: true }));
          next.hypotheses = [{ id: "repaired", value: "qualified", confidence: 0.8, support: ["source:a", "source:b"], contradictions: [] }];
        }

        if (scenario === "provenance" && context.round >= 2) {
          next.unresolved = next.evidence.some((evidence) => evidence.provenance.length === 0) ? ["missing-provenance"] : [];
        }

        if (scenario === "association-not-culpability" && context.round >= 2) {
          next.hypotheses = [{ id: "association-only", value: "documented association only", confidence: 0.9, support: ["source:contact"], contradictions: [] }];
          next.unresolved = [];
        }

        return { packet: next, reasons: [`scenario=${scenario}`, `round=${context.round}`] };
      },
    };

    const validate = async (candidate: CogPacket) => {
      const scenario = String(candidate.metadata.scenario);
      if (scenario === "unsupported") {
        return { valid: false, reasons: ["claim lacks documentary support"], seek: ["supporting-source"] };
      }
      if (candidate.challenges.some((challenge) => !challenge.resolved)) {
        return { valid: false, reasons: ["unresolved contradiction"] };
      }
      if (candidate.unresolved.length > 0) {
        return { valid: false, reasons: [...candidate.unresolved] };
      }
      if (scenario === "association-not-culpability" && candidate.hypotheses.some((hypothesis) => String(hypothesis.value).includes("culpable"))) {
        return { valid: false, reasons: ["association does not establish culpability"] };
      }
      return { valid: true, reasons: [] };
    };

    const project = async (candidate: CogPacket, reasons: string[]) => ({
      disposition: "assert" as const,
      packet: candidate,
      ordered: candidate.evidence.map((evidence) => evidence.id),
      provenance: [...new Set(candidate.evidence.flatMap((evidence) => evidence.provenance))],
      confidence: candidate.hypotheses[0]?.confidence ?? 0.8,
      friction: candidate.friction,
      reasons,
    });

    const recurrent = new CogMoleculeRuntime({ cogs: [cog], validate, project, maxRounds: 8 });
    const linear = new LinearBaselineRuntime({ cogs: [cog], validate, project });

    const easy = packet("easy-supported", "easy", "assert");
    easy.evidence.push({ id: "source:a", value: "supported fact", provenance: ["source:a"], confidence: 0.95 });

    const late = packet("late-evidence", "late-evidence", "assert");
    late.unresolved = ["awaiting-late-source"];

    const contradiction = packet("contradiction", "contradiction", "assert");
    contradiction.challenges.push({ id: "conflict-1", source: "source:a", target: "source:b", reason: "sources conflict", provenance: ["source:a", "source:b"], resolved: false });

    const unsupported = packet("unsupported", "unsupported", "seek_more_information");

    const provenance = packet("provenance", "provenance", "assert");
    provenance.evidence.push({ id: "documented", value: "traceable", provenance: ["source:documented"], confidence: 0.9 });
    provenance.unresolved = ["verify-provenance"];

    const association = packet("association", "association-not-culpability", "assert");
    association.evidence.push({ id: "contact", value: "documented contact", provenance: ["source:contact"], confidence: 0.9 });
    association.hypotheses.push({ id: "premature", value: "culpable", confidence: 0.6, support: ["source:contact"], contradictions: [] });
    association.unresolved = ["association-does-not-prove-culpability"];

    const comparison = await compareRuntimes(recurrent, linear, [easy, late, contradiction, unsupported, provenance, association].map((value) => ({ id: value.id, packet: value, correct })));

    expect(comparison.candidate.accuracy).toBe(1);
    expect(comparison.candidate.falseReleaseRate).toBe(0);
    expect(comparison.candidate.accuracy).toBeGreaterThan(comparison.baseline.accuracy);
    expect(comparison.candidate.meanCompute).toBeGreaterThan(comparison.baseline.meanCompute);
  });
});
