import {
  nextRetrievalTier,
  type RetrievalTier,
} from "./retrievalResolution.js";

export interface RetrievalEvidence<T = unknown> {
  tier: RetrievalTier;
  items: T[];
  provenance: string[];
  sufficient: boolean;
}

export interface RetrievalRun<T = unknown> {
  attempted: RetrievalTier[];
  evidence: RetrievalEvidence<T>[];
  sufficient: boolean;
}

export async function runTieredRetrieval<T>(
  retrieve: (tier: RetrievalTier) => Promise<RetrievalEvidence<T>>,
): Promise<RetrievalRun<T>> {
  const attempted: RetrievalTier[] = [];
  const evidence: RetrievalEvidence<T>[] = [];
  let sufficient = false;

  while (true) {
    const tier = nextRetrievalTier(attempted, sufficient);
    if (!tier) break;

    attempted.push(tier);
    const result = await retrieve(tier);
    evidence.push({
      tier,
      items: structuredClone(result.items),
      provenance: [...result.provenance],
      sufficient: result.sufficient,
    });

    sufficient = result.sufficient;
  }

  return { attempted, evidence, sufficient };
}

export function flattenedProvenance<T>(run: RetrievalRun<T>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const packet of run.evidence) {
    for (const source of packet.provenance) {
      if (seen.has(source)) continue;
      seen.add(source);
      out.push(source);
    }
  }
  return out;
}
