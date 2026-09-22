import { describe, expect, it } from "vitest";
import { compareRuntimes } from "./comparisonHarness.js";
import { LinearBaselineRuntime } from "./linearBaseline.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket, MoleculeResult } from "./types.js";

type Expected = "assert" | "seek_more_information" | "abstain";
const packet = (id: string, scenario: string, expected: Expected): CogPacket => ({ id, evidence: [], hypotheses: [], unresolved: [], challenges: [], provenance: [`torture:${scenario}`], friction: 0, circulation: 0, metadata: { scenario, expected } });
const correct = (result: MoleculeResult): boolean => result.disposition === result.packet.metadata.expected;

describe("adversarial evidence torture diagnostic", () => {
  it("attacks recurrence with late/reordered evidence, contradiction, provenance, association traps, corrections, and noisy retrieval", async () => {
    const cog: Cog = { id: "evidence-worker", async process(current, context) {
      const next = structuredClone(current); const scenario = String(next.metadata.scenario);
      if ((scenario === "late-evidence" || scenario === "reordered-arrival") && context.round >= 2) { next.evidence.push({ id: "late-source", value: "corroborated", provenance: ["source:late"], confidence: 0.95 }); next.unresolved = []; }
      if ((scenario === "contradiction" || scenario === "multi-contradiction") && context.round >= 2) { next.challenges = next.challenges.map((c) => ({ ...c, resolved: true })); next.hypotheses = [{ id: "repaired", value: "qualified", confidence: 0.8, support: ["source:a", "source:b"], contradictions: [] }]; }
      if (scenario === "provenance" && context.round >= 2) next.unresolved = next.evidence.some((e) => e.provenance.length === 0) ? ["missing-provenance"] : [];
      if (scenario === "association-not-culpability" && context.round >= 2) { next.hypotheses = [{ id: "association-only", value: "documented association only", confidence: 0.9, support: ["source:contact"], contradictions: [] }]; next.unresolved = []; }
      if (scenario === "late-correction" && context.round >= 3) { next.hypotheses = [{ id: "corrected", value: "corrected claim", confidence: 0.92, support: ["source:correction"], contradictions: [] }]; next.evidence.push({ id: "correction", value: "later correction", provenance: ["source:correction"], confidence: 0.98 }); next.unresolved = []; }
      if (scenario === "noisy-duplicates" && context.round >= 2) { for (let i = 0; i < 5; i++) next.evidence.push({ id: "repeat", value: "same retrieval", provenance: ["source:repeat"], confidence: 0.9 }); next.unresolved = []; }
      return { packet: next, reasons: [`scenario=${scenario}`, `round=${context.round}`] };
    } };
    const validate = async (candidate: CogPacket) => {
      const scenario = String(candidate.metadata.scenario);
      if (scenario === "unsupported" || scenario === "missing-source") return { valid: false, reasons: ["documentary support required"], seek: ["supporting-source"] };
      if (candidate.challenges.some((c) => !c.resolved)) return { valid: false, reasons: ["unresolved contradiction"] };
      if (candidate.unresolved.length) return { valid: false, reasons: [...candidate.unresolved] };
      if (scenario === "association-not-culpability" && candidate.hypotheses.some((h) => String(h.value).includes("culpable"))) return { valid: false, reasons: ["association does not establish culpability"] };
      return { valid: true, reasons: [] };
    };
    const project = async (candidate: CogPacket, reasons: string[]) => ({ disposition: "assert" as const, packet: candidate, ordered: candidate.evidence.map((e) => e.id), provenance: [...new Set(candidate.evidence.flatMap((e) => e.provenance))], confidence: candidate.hypotheses[0]?.confidence ?? 0.8, friction: candidate.friction, reasons });
    const recurrent = new CogMoleculeRuntime({ cogs: [cog], validate, project, maxRounds: 12 }); const linear = new LinearBaselineRuntime({ cogs: [cog], validate, project });
    const cases: CogPacket[] = [];
    const easy = packet("easy", "easy", "assert"); easy.evidence.push({ id: "source:a", value: "supported", provenance: ["source:a"], confidence: 0.95 }); cases.push(easy);
    const late = packet("late", "late-evidence", "assert"); late.unresolved=["awaiting-late-source"]; cases.push(late);
    const reorder = packet("reordered", "reordered-arrival", "assert"); reorder.evidence.push({ id:"later-fragment", value:"arrived first", provenance:["source:later"], confidence:.8 }); reorder.unresolved=["earlier-link-missing"]; cases.push(reorder);
    const conflict = packet("conflict", "contradiction", "assert"); conflict.challenges.push({id:"c1",source:"a",target:"b",reason:"conflict",provenance:["a","b"],resolved:false}); cases.push(conflict);
    const multi = packet("multi", "multi-contradiction", "assert"); for(let i=0;i<3;i++) multi.challenges.push({id:`mc${i}`,source:`s${i}`,target:`t${i}`,reason:"conflict",provenance:[`s${i}`,`t${i}`],resolved:false}); cases.push(multi);
    cases.push(packet("unsupported","unsupported","seek_more_information"), packet("missing","missing-source","seek_more_information"));
    const provenance = packet("provenance","provenance","assert"); provenance.evidence.push({id:"doc",value:"traceable",provenance:["source:doc"],confidence:.9}); provenance.unresolved=["verify-provenance"]; cases.push(provenance);
    const association = packet("association","association-not-culpability","assert"); association.evidence.push({id:"contact",value:"documented contact",provenance:["source:contact"],confidence:.9}); association.hypotheses.push({id:"premature",value:"culpable",confidence:.6,support:["source:contact"],contradictions:[]}); association.unresolved=["association-does-not-prove-culpability"]; cases.push(association);
    const correction=packet("correction","late-correction","assert"); correction.hypotheses.push({id:"old",value:"old claim",confidence:.8,support:["source:old"],contradictions:[]}); correction.unresolved=["correction-pending"]; cases.push(correction);
    const noisy=packet("noisy","noisy-duplicates","assert"); noisy.unresolved=["repeat-retrieval"]; cases.push(noisy);

    const comparison = await compareRuntimes(recurrent, linear, cases.map((value)=>({id:value.id,packet:value,correct})));
    const recurrentFailures=comparison.candidateSamples.filter((s)=>!s.correct).map((s)=>s.id); const linearFailures=comparison.baselineSamples.filter((s)=>!s.correct).map((s)=>s.id);
    console.info("adversarial diagnostic",{recurrentFailures,linearFailures,candidate:comparison.candidate,baseline:comparison.baseline});
    expect(comparison.candidate.falseReleaseRate).toBe(0);
    expect(comparison.candidate.accuracy).toBeGreaterThanOrEqual(comparison.baseline.accuracy);
    expect(comparison.candidate.meanCompute).toBeGreaterThan(comparison.baseline.meanCompute);
    expect(recurrentFailures).toEqual([]);
  });
});
