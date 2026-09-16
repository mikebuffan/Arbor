import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enqueueHop,
  finishBranch,
  objectiveComplete,
  rankEvidence,
  takeNextHop,
  type PatternHopEdge,
  type PatternHopEvidence,
  type PatternHopState,
} from "@/lib/memory/patternHop";
import {
  classifyHistoricalEvidence,
  searchHistoricalHopEvidence,
} from "@/lib/memory/patternHopRetrieval";
import {
  createPatternHopRun,
  loadPatternHopRun,
  persistPatternHopEdges,
  persistPatternHopEvidence,
  savePatternHopRun,
} from "@/lib/memory/patternHopStore";

export const DEFAULT_PATTERN_HOP_BRANCHES = [
  "direct_matches",
  "neighboring_concepts",
  "people_entities",
  "terminology_changes",
  "causal_predecessors",
  "consequences",
  "retrospective_references",
  "chronology_anchors",
  "implementation_architecture",
  "behavioral_results",
  "contradictions",
] as const;

function clueTerms(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? [];
  const stop = new Set([
    "the", "and", "that", "this", "with", "from", "have", "were",
    "what", "when", "where", "into", "about", "your", "you", "but",
    "not", "for", "are", "was", "then", "they",
  ]);
  return Array.from(
    new Set(words.filter((word) => !stop.has(word.toLowerCase()))),
  ).slice(0, 10);
}

function branchClue(
  branch: string,
  seed: string,
  evidence?: PatternHopEvidence,
): string {
  const body = evidence?.content ?? seed;
  const terms = clueTerms(body);

  switch (branch) {
    case "people_entities":
      return terms.filter((term) => /^[A-Z]/.test(term)).slice(0, 4).join(" ") || seed;
    case "causal_predecessors":
      return seed + " before earlier cause origin first";
    case "consequences":
      return seed + " after result consequence later";
    case "retrospective_references":
      return seed + " remember later said told you";
    case "chronology_anchors":
      return seed + " date first earliest timeline";
    case "implementation_architecture":
      return seed + " code schema backend implementation architecture";
    case "behavioral_results":
      return seed + " behavior worked failed regression recovery";
    case "terminology_changes":
      return seed + " called named term renamed";
    case "contradictions":
      return seed + " wrong correction contradiction not true";
    case "neighboring_concepts":
      return terms.slice(0, 6).join(" ") || seed;
    default:
      return seed;
  }
}

function toEvidence(row: Awaited<ReturnType<typeof searchHistoricalHopEvidence>>[number]): PatternHopEvidence {
  const classification = classifyHistoricalEvidence(row.role);
  return {
    id: row.id,
    source: row.source,
    sourceThreadId: row.sourceThreadId,
    sourceMessageId: row.sourceMessageId,
    speaker: row.role,
    evidenceType: classification.evidenceType,
    content: row.content,
    occurredAt: row.occurredAt,
    confidence: Math.max(0, Math.min(1, row.similarity ?? 0.5)),
    epistemicStatus: classification.epistemicStatus,
  };
}

export async function runPatternHopResearch(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  seed: string;
  objective?: string;
  maxDepth?: number;
  maxHops?: number;
  runId?: string;
}) {
  let run = params.runId
    ? await loadPatternHopRun({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        runId: params.runId,
      })
    : null;

  if (params.runId && !run) {
    throw new Error("pattern_hop_run_not_found");
  }

  if (!run) {
    run = await createPatternHopRun({
      supabase: params.supabase,
      userId: params.userId,
      projectId: params.projectId,
      conversationId: params.conversationId,
      objective: params.objective ?? "Pattern-hop research: " + params.seed,
      seed: { clue: params.seed },
      maxDepth: params.maxDepth,
    });

    for (const branch of DEFAULT_PATTERN_HOP_BRANCHES) {
      run.state = enqueueHop(run.state, {
        evidenceId: "seed",
        clue: branchClue(branch, params.seed),
        depth: 0,
        branch,
      });
    }

    await savePatternHopRun({
      supabase: params.supabase,
      runId: run.id,
      userId: params.userId,
      projectId: params.projectId,
      state: run.state,
    });
  }

  let state: PatternHopState = run.state;
  const found: PatternHopEvidence[] = [];
  const edges: PatternHopEdge[] = [];
  const maxHops = Math.max(1, Math.min(params.maxHops ?? 24, 100));

  for (let i = 0; i < maxHops && state.status === "active"; i += 1) {
    const nextResult = takeNextHop(state);
    state = nextResult.state;
    const next = nextResult.next;

    if (!next) break;

    let rows: Awaited<ReturnType<typeof searchHistoricalHopEvidence>> = [];

    try {
      rows = await searchHistoricalHopEvidence({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        clue: next.clue,
        limit: 8,
      });
    } catch (error) {
      state = {
        ...state,
        status: "blocked",
        blocker:
          error instanceof Error
            ? error.message
            : "pattern_hop_retrieval_failed",
      };
      break;
    }

    const accepted = rows
      .filter((row) => (row.similarity ?? 0) >= 0.45)
      .map(toEvidence);

    const unique = accepted.filter(
      (evidence) => !found.some((existing) => existing.id === evidence.id),
    );

    if (unique.length === 0) {
      state = finishBranch(state, next.branch, false);
    } else {
      found.push(...unique);
      state = finishBranch(state, next.branch, true);

      for (const evidence of unique.slice(0, 3)) {
        edges.push({
          fromEvidenceId:
            next.evidenceId === "seed" ? null : next.evidenceId,
          toEvidenceId: evidence.id,
          originatingClue: next.clue,
          relationship: next.branch,
          hopDepth: next.depth,
          confidence: evidence.confidence,
          epistemicStatus: "derived",
          rationale:
            "Retrieved because it matched the " + next.branch + " clue.",
        });

        if (next.depth + 1 <= state.maxDepth) {
          for (const branch of [
            "neighboring_concepts",
            "terminology_changes",
            "causal_predecessors",
            "consequences",
            "retrospective_references",
            "contradictions",
          ]) {
            state = enqueueHop(state, {
              evidenceId: evidence.id,
              clue: branchClue(branch, params.seed, evidence),
              depth: next.depth + 1,
              branch: next.branch + ">" + branch,
            });
          }
        }
      }
    }

    await savePatternHopRun({
      supabase: params.supabase,
      runId: run.id,
      userId: params.userId,
      projectId: params.projectId,
      state,
    });
  }

  const idMap = await persistPatternHopEvidence({
    supabase: params.supabase,
    runId: run.id,
    userId: params.userId,
    projectId: params.projectId,
    evidence: found,
  });

  await persistPatternHopEdges({
    supabase: params.supabase,
    runId: run.id,
    idMap,
    edges,
  });

  const rootBranches = [...DEFAULT_PATTERN_HOP_BRANCHES];

  if (state.status === "active" && objectiveComplete(state, rootBranches)) {
    state = { ...state, status: "complete" };
  }

  if (state.status === "active" && state.frontier.length === 0) {
    state = { ...state, status: "exhausted" };
  }

  const verificationState = {
    rootBranches,
    foundEvidence: found.length,
    edgeCount: edges.length,
    frontierRemaining: state.frontier.length,
    completedBranches: state.completedBranches.length,
    exhaustedBranches: state.exhaustedBranches.length,
  };

  await savePatternHopRun({
    supabase: params.supabase,
    runId: run.id,
    userId: params.userId,
    projectId: params.projectId,
    state,
    verificationState,
  });

  return {
    runId: run.id,
    status: state.status,
    blocker: state.blocker ?? null,
    state,
    evidence: rankEvidence(found),
    edges,
    verificationState,
  };
}
