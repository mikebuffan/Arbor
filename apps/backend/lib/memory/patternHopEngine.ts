import type { PatternHopEvidence, PatternHopEpistemicStatus } from "@/lib/memory/patternHop";

export type PatternHopRelationship =
  | "same_phrase"
  | "semantic_similarity"
  | "same_concept"
  | "same_entity"
  | "chronological_adjacent"
  | "causal_candidate"
  | "correction_supersession"
  | "contradiction"
  | "implementation_of"
  | "consequence_of"
  | "prediction_before_observation"
  | "repeated_failure"
  | "behavioral_recurrence"
  | "provenance"
  | "version_lineage"
  | "unknown";

export type PatternHopCandidate = {
  evidence: PatternHopEvidence;
  retrievalScore: number;
  retrievalMethod: string;
};

export type PatternHopScoredCandidate = PatternHopCandidate & {
  relationship: PatternHopRelationship;
  relationshipReason: string;
  score: number;
  novelty: number;
  epistemicPenalty: number;
};

export type PatternHopPathStep = {
  evidenceId: string;
  parentEvidenceId: string | null;
  depth: number;
  relationship: PatternHopRelationship;
  rationale: string;
  score: number;
  epistemicStatus: PatternHopEpistemicStatus;
  retrievalMethod: string;
};

const STOP = new Set(["the","and","that","this","with","from","have","were","what","when","where","into","about","your","you","but","not","for","are","was","then","they","will","would","there","their","been"]);

export function normalizeHopTerms(text: string): string[] {
  return Array.from(new Set((text.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? []).filter(t => !STOP.has(t))));
}

function overlap(a: string, b: string): number {
  const aa = new Set(normalizeHopTerms(a));
  const bb = new Set(normalizeHopTerms(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const term of aa) if (bb.has(term)) common += 1;
  return common / Math.max(aa.size, bb.size);
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text));
}

export function detectHopRelationship(parent: PatternHopEvidence | null, candidate: PatternHopEvidence): { relationship: PatternHopRelationship; reason: string } {
  if (!parent) return { relationship: "unknown", reason: "Seed retrieval; no parent evidence node." };
  const p = parent.content.toLowerCase();
  const c = candidate.content.toLowerCase();
  const shared = overlap(p, c);

  if (hasAny(c, [/\bimplement/, /\bcode\b/, /\bschema\b/, /\bmigration\b/, /\bbackend\b/, /\bruntime\b/]) && shared >= 0.12)
    return { relationship: "implementation_of", reason: "Candidate connects shared subject matter to implementation/architecture evidence." };
  if (hasAny(c, [/\bcorrection\b/, /\bactually\b/, /\bsupersed/, /\bno longer\b/, /\binstead\b/]) && shared >= 0.12)
    return { relationship: "correction_supersession", reason: "Candidate shares subject matter and contains correction/supersession language." };
  if (hasAny(c, [/\bcontradict/, /\bwrong\b/, /\bnot true\b/, /\bdidn['’]?t\b/, /\bnever\b/]) && shared >= 0.12)
    return { relationship: "contradiction", reason: "Candidate shares subject matter and contains contradiction language." };
  if (hasAny(c, [/\bbecause\b/, /\bcaused\b/, /\broot cause\b/, /\bled to\b/, /\bresulted\b/]) && shared >= 0.16)
    return { relationship: "causal_candidate", reason: "Candidate contains causal language, but causation remains a candidate rather than established fact." };
  if (parent.occurredAt && candidate.occurredAt && shared >= 0.18) {
    const delta = Math.abs(Date.parse(parent.occurredAt) - Date.parse(candidate.occurredAt));
    if (Number.isFinite(delta) && delta <= 1000 * 60 * 60 * 24 * 3)
      return { relationship: "chronological_adjacent", reason: "Evidence is topically related and occurred within three days." };
  }
  if (shared >= 0.55) return { relationship: "same_phrase", reason: "High lexical overlap suggests a repeated or closely preserved phrase." };
  if (shared >= 0.25) return { relationship: "same_concept", reason: "Meaningful lexical overlap supports a shared concept without proving provenance." };
  return { relationship: "semantic_similarity", reason: "Retriever linked the evidence, but stronger relationship evidence was not established." };
}

function epistemicPenalty(status: PatternHopEpistemicStatus): number {
  switch (status) {
    case "direct": return 0;
    case "contradictory": return 0.02;
    case "derived": return 0.08;
    case "retrospective": return 0.16;
    case "hypothesis": return 0.28;
  }
}

const relationshipBonus: Record<PatternHopRelationship, number> = {
  same_phrase: 0.14,
  semantic_similarity: 0,
  same_concept: 0.08,
  same_entity: 0.07,
  chronological_adjacent: 0.08,
  causal_candidate: 0.06,
  correction_supersession: 0.18,
  contradiction: 0.2,
  implementation_of: 0.16,
  consequence_of: 0.12,
  prediction_before_observation: 0.18,
  repeated_failure: 0.14,
  behavioral_recurrence: 0.12,
  provenance: 0.14,
  version_lineage: 0.16,
  unknown: -0.05,
};

export function scoreHopCandidate(params: {
  parent: PatternHopEvidence | null;
  candidate: PatternHopCandidate;
  visitedEvidenceIds: Set<string>;
}): PatternHopScoredCandidate {
  const detected = detectHopRelationship(params.parent, params.candidate.evidence);
  const novelty = params.visitedEvidenceIds.has(params.candidate.evidence.id) ? 0 : 1;
  const penalty = epistemicPenalty(params.candidate.evidence.epistemicStatus);
  const evidenceConfidence = Math.max(0, Math.min(1, params.candidate.evidence.confidence));
  const retrieval = Math.max(0, Math.min(1, params.candidate.retrievalScore));
  const raw = retrieval * 0.42 + evidenceConfidence * 0.28 + novelty * 0.12 + relationshipBonus[detected.relationship] - penalty;
  return {
    ...params.candidate,
    relationship: detected.relationship,
    relationshipReason: detected.reason,
    novelty,
    epistemicPenalty: penalty,
    score: Math.max(0, Math.min(1, raw)),
  };
}

export function selectNextHopCandidates(params: {
  parent: PatternHopEvidence | null;
  candidates: PatternHopCandidate[];
  visitedEvidenceIds: Set<string>;
  minScore?: number;
  branchLimit?: number;
}): PatternHopScoredCandidate[] {
  const minScore = params.minScore ?? 0.42;
  const branchLimit = Math.max(1, params.branchLimit ?? 3);
  const deduped = new Map<string, PatternHopCandidate>();
  for (const candidate of params.candidates) {
    if (params.visitedEvidenceIds.has(candidate.evidence.id)) continue;
    const existing = deduped.get(candidate.evidence.id);
    if (!existing || candidate.retrievalScore > existing.retrievalScore) deduped.set(candidate.evidence.id, candidate);
  }
  return [...deduped.values()]
    .map(candidate => scoreHopCandidate({ parent: params.parent, candidate, visitedEvidenceIds: params.visitedEvidenceIds }))
    .filter(candidate => candidate.score >= minScore)
    .sort((a,b) => b.score - a.score)
    .slice(0, branchLimit);
}

export function buildPathStep(params: {
  candidate: PatternHopScoredCandidate;
  parentEvidenceId: string | null;
  depth: number;
}): PatternHopPathStep {
  return {
    evidenceId: params.candidate.evidence.id,
    parentEvidenceId: params.parentEvidenceId,
    depth: params.depth,
    relationship: params.candidate.relationship,
    rationale: params.candidate.relationshipReason,
    score: params.candidate.score,
    epistemicStatus: params.candidate.evidence.epistemicStatus,
    retrievalMethod: params.candidate.retrievalMethod,
  };
}

export function projectPatternHopForRuntime(params: {
  evidence: PatternHopEvidence[];
  path: PatternHopPathStep[];
  maxItems?: number;
}): Array<{ evidenceId: string; content: string; relationship: PatternHopRelationship; epistemicStatus: PatternHopEpistemicStatus; confidence: number; occurredAt: string | null }> {
  const byId = new Map(params.evidence.map(item => [item.id, item]));
  const maxItems = Math.max(1, Math.min(params.maxItems ?? 8, 20));
  return params.path
    .filter(step => step.epistemicStatus !== "hypothesis" || step.score >= 0.7)
    .sort((a,b) => b.score - a.score)
    .slice(0, maxItems)
    .flatMap(step => {
      const evidence = byId.get(step.evidenceId);
      if (!evidence) return [];
      return [{
        evidenceId: evidence.id,
        content: evidence.content,
        relationship: step.relationship,
        epistemicStatus: evidence.epistemicStatus,
        confidence: Math.min(evidence.confidence, step.score),
        occurredAt: evidence.occurredAt ?? null,
      }];
    });
}

export function causalClaimAllowed(step: PatternHopPathStep): boolean {
  return step.relationship === "consequence_of" || step.relationship === "implementation_of" || step.relationship === "prediction_before_observation";
}
