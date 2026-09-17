import type { CogChallenge, CogEvidence, CogHypothesis, CogPacket } from "./types.js";

export type ExportFact = {
  id: string;
  value: unknown;
  source: string;
  confidence?: number;
  destination?: string;
  unresolved?: string[];
};

export type ExportRelationship = {
  id: string;
  from: string;
  to: string;
  relation: string;
  source: string;
  confidence?: number;
  contestedBy?: string[];
};

export type StructuredExportRecord = {
  id: string;
  facts?: ExportFact[];
  relationships?: ExportRelationship[];
  unresolved?: string[];
  provenance?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Loss-aware boundary adapter for the structured export reread.
 * It intentionally does not resolve contradictions or infer missing links;
 * that work belongs inside the recurrent runtime.
 */
export function exportRecordToCogPacket(record: StructuredExportRecord): CogPacket {
  const evidence: CogEvidence[] = [];
  const hypotheses: CogHypothesis[] = [];
  const challenges: CogChallenge[] = [];
  const provenance = new Set(record.provenance ?? []);

  for (const fact of record.facts ?? []) {
    provenance.add(fact.source);
    evidence.push({ id: fact.id, value: fact.value, provenance: [fact.source], confidence: fact.confidence ?? 0.8 });
  }

  for (const relation of record.relationships ?? []) {
    provenance.add(relation.source);
    const supportId = `relationship:${relation.id}`;
    evidence.push({
      id: supportId,
      value: { from: relation.from, to: relation.to, relation: relation.relation },
      provenance: [relation.source],
      confidence: relation.confidence ?? 0.75,
    });
    hypotheses.push({ id: relation.id, value: relation.relation, confidence: relation.confidence ?? 0.75, support: [supportId], contradictions: relation.contestedBy ?? [] });
    for (const contest of relation.contestedBy ?? []) {
      challenges.push({ id: `${relation.id}:contest:${contest}`, source: contest, target: relation.id, reason: "export relationship is contested", provenance: [relation.source, contest], resolved: false });
    }
  }

  const unresolved = [...(record.unresolved ?? []), ...(record.facts ?? []).flatMap((fact) => fact.unresolved ?? [])];
  return {
    id: record.id,
    destination: (record.facts ?? []).find((fact) => fact.destination)?.destination,
    evidence,
    hypotheses,
    unresolved: [...new Set(unresolved)],
    challenges,
    provenance: [...provenance],
    friction: 0,
    circulation: 0,
    metadata: { ...(record.metadata ?? {}), sourceKind: "structured-export" },
  };
}
