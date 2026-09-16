export type PatternHopEpistemicStatus =
  | "direct"
  | "derived"
  | "hypothesis"
  | "retrospective"
  | "contradictory";

export type PatternHopEvidence = {
  id: string;
  source: string;
  sourceThreadId?: string | null;
  sourceMessageId?: string | null;
  sourceArtifactId?: string | null;
  speaker?: string | null;
  evidenceType: string;
  content: string;
  occurredAt?: string | null;
  chronologyRank?: number | null;
  confidence: number;
  epistemicStatus: PatternHopEpistemicStatus;
};

export type PatternHopEdge = {
  fromEvidenceId?: string | null;
  toEvidenceId: string;
  originatingClue: string;
  relationship: string;
  hopDepth: number;
  confidence: number;
  epistemicStatus: "direct" | "derived" | "hypothesis";
  rationale: string;
};

export type PatternHopFrontierItem = {
  evidenceId: string;
  clue: string;
  depth: number;
  branch: string;
};

export type PatternHopState = {
  objective: string;
  maxDepth: number;
  frontier: PatternHopFrontierItem[];
  visited: string[];
  completedBranches: string[];
  exhaustedBranches: string[];
  status: "active" | "complete" | "blocked" | "exhausted";
  blocker?: string | null;
};

export function evidenceFingerprint(e: Pick<PatternHopEvidence, "source"|"sourceMessageId"|"content">): string {
  return [e.source, e.sourceMessageId ?? "", e.content.trim().toLowerCase()].join("::");
}

export function chronologyWeight(status: PatternHopEpistemicStatus): number {
  switch (status) {
    case "direct": return 1;
    case "contradictory": return 0.95;
    case "derived": return 0.72;
    case "retrospective": return 0.55;
    case "hypothesis": return 0.35;
  }
}

export function rankEvidence(evidence: PatternHopEvidence[]): PatternHopEvidence[] {
  return [...evidence].sort((a,b) => {
    const at = a.occurredAt ? Date.parse(a.occurredAt) : Number.POSITIVE_INFINITY;
    const bt = b.occurredAt ? Date.parse(b.occurredAt) : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    const epistemic = chronologyWeight(b.epistemicStatus) - chronologyWeight(a.epistemicStatus);
    if (epistemic !== 0) return epistemic;
    return b.confidence - a.confidence;
  });
}

export function addEvidenceUnique(current: PatternHopEvidence[], incoming: PatternHopEvidence[]): PatternHopEvidence[] {
  const seen = new Set(current.map(evidenceFingerprint));
  const out = [...current];
  for (const item of incoming) {
    const fp = evidenceFingerprint(item);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(item);
  }
  return out;
}

export function enqueueHop(state: PatternHopState, item: PatternHopFrontierItem): PatternHopState {
  if (state.status !== "active" || item.depth > state.maxDepth) return state;
  const key = [item.evidenceId,item.clue,item.depth,item.branch].join("::");
  if (state.visited.includes(key)) return state;
  if (state.frontier.some(x => [x.evidenceId,x.clue,x.depth,x.branch].join("::") === key)) return state;
  return {...state, frontier:[...state.frontier,item]};
}

export function takeNextHop(state: PatternHopState): {state:PatternHopState; next:PatternHopFrontierItem|null} {
  if (state.status !== "active" || !state.frontier.length) {
    return {state:{...state,status:state.status === "active" ? "exhausted" : state.status},next:null};
  }
  const [next,...rest]=state.frontier;
  const key=[next.evidenceId,next.clue,next.depth,next.branch].join("::");
  return {state:{...state,frontier:rest,visited:[...state.visited,key]},next};
}

export function finishBranch(state: PatternHopState, branch:string, found:boolean): PatternHopState {
  const target=found ? "completedBranches" : "exhaustedBranches";
  if (state[target].includes(branch)) return state;
  return {...state,[target]:[...state[target],branch]};
}

export function objectiveComplete(state: PatternHopState, requiredBranches:string[]): boolean {
  return requiredBranches.every(branch => state.completedBranches.includes(branch) || state.exhaustedBranches.includes(branch))
    && state.frontier.length === 0;
}
