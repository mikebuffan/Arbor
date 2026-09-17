import type { Cog, CogHypothesis, CogPacket } from "./types.js";

export type HypothesisScorer = (hypothesis: CogHypothesis, packet: CogPacket) => number;

export function createHypothesisResolutionCog(id: string, score: HypothesisScorer, margin = 0.15): Cog {
  return {
    id,
    async process(packet) {
      if (packet.hypotheses.length < 2) return { packet, reasons: ["insufficient competing hypotheses"] };
      const next = structuredClone(packet);
      const ranked = next.hypotheses
        .map((hypothesis) => ({ hypothesis, score: clamp01(score(hypothesis, next)) }))
        .sort((a, b) => b.score - a.score);
      next.hypotheses = ranked.map(({ hypothesis, score }) => ({ ...hypothesis, confidence: score }));
      const gap = ranked[0].score - ranked[1].score;
      const relation = `hypothesis:${ranked[0].hypothesis.id}`;
      if (gap < margin) {
        next.unresolved = unique([...next.unresolved, relation]);
        return { packet: next, reasons: [`competing hypotheses remain close: margin=${gap.toFixed(3)}`] };
      }
      next.unresolved = next.unresolved.filter((item) => !item.startsWith("hypothesis:"));
      return { packet: next, reasons: [`hypothesis ${ranked[0].hypothesis.id} leads by ${gap.toFixed(3)}`] };
    },
  };
}

function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }
function unique(values: string[]) { return [...new Set(values)]; }