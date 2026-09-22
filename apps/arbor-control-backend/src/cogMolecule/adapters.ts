import { learnedRouteScore, type ArborRecoveryRouteStats } from "../agencyRecovery/routeLearning.js";
import { runPatternHopPass } from "../patternHop.js";
import type { Cog, CogPacket } from "./types.js";

export function createRouteLearningCog(id: string, routeId: string, stats: ArborRecoveryRouteStats, baseConfidence = 0.5): Cog {
  return {
    id,
    async process(packet) {
      const next = structuredClone(packet);
      const score = learnedRouteScore({ baseConfidence, stats });
      next.metadata.routeLearning = { routeId, score, attempts: stats.attempts, consecutiveFailures: stats.consecutiveFailures };
      return { packet: next, reasons: [`route ${routeId} learned score=${score.toFixed(3)}`] };
    },
  };
}

export function attachPatternHopEvidence(packet: CogPacket): CogPacket {
  const next = structuredClone(packet);
  const results = runPatternHopPass();
  next.metadata.patternHop = results.map((result) => ({
    patternId: result.patternId, status: result.status, confidence: result.confidence,
    supportingDomains: result.supportingDomains, discoveredDomains: result.discoveredDomains,
  }));
  next.provenance = [...new Set([...next.provenance, "arbor:pattern-hop-pass"])];
  return next;
}