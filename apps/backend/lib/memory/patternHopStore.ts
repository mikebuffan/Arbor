import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatternHopEdge, PatternHopEvidence, PatternHopState } from "@/lib/memory/patternHop";

export type PatternHopRunRecord = {
  id: string;
  userId: string;
  projectId: string;
  conversationId: string | null;
  state: PatternHopState;
  seed: Record<string, unknown>;
  verificationState: Record<string, unknown>;
};

function mapState(row: any): PatternHopState {
  return {
    objective: String(row.objective),
    maxDepth: Number(row.max_depth ?? 6),
    frontier: Array.isArray(row.frontier) ? row.frontier : [],
    visited: Array.isArray(row.visited) ? row.visited : [],
    completedBranches: Array.isArray(row.completed_branches) ? row.completed_branches : [],
    exhaustedBranches: Array.isArray(row.exhausted_branches) ? row.exhausted_branches : [],
    status: row.status,
    blocker: row.blocker ?? null,
  };
}

export async function createPatternHopRun(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  objective: string;
  seed?: Record<string, unknown>;
  maxDepth?: number;
}): Promise<PatternHopRunRecord> {
  const state: PatternHopState = {
    objective: params.objective,
    maxDepth: Math.max(1, Math.min(params.maxDepth ?? 6, 32)),
    frontier: [],
    visited: [],
    completedBranches: [],
    exhaustedBranches: [],
    status: "active",
    blocker: null,
  };

  const { data, error } = await params.supabase
    .from("arbor_pattern_hop_runs")
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      conversation_id: params.conversationId ?? null,
      objective: state.objective,
      seed: params.seed ?? {},
      status: state.status,
      max_depth: state.maxDepth,
      frontier: state.frontier,
      visited: state.visited,
      completed_branches: state.completedBranches,
      exhausted_branches: state.exhaustedBranches,
      blocker: null,
      verification_state: {},
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    userId: params.userId,
    projectId: params.projectId,
    conversationId: data.conversation_id ?? null,
    state: mapState(data),
    seed: data.seed ?? {},
    verificationState: data.verification_state ?? {},
  };
}

export async function loadPatternHopRun(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  runId: string;
}): Promise<PatternHopRunRecord | null> {
  const { data, error } = await params.supabase
    .from("arbor_pattern_hop_runs")
    .select("*")
    .eq("id", params.runId)
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    userId: params.userId,
    projectId: params.projectId,
    conversationId: data.conversation_id ?? null,
    state: mapState(data),
    seed: data.seed ?? {},
    verificationState: data.verification_state ?? {},
  };
}

export async function savePatternHopRun(params: {
  supabase: SupabaseClient;
  runId: string;
  userId: string;
  projectId: string;
  state: PatternHopState;
  verificationState?: Record<string, unknown>;
}) {
  const s = params.state;
  const { error } = await params.supabase
    .from("arbor_pattern_hop_runs")
    .update({
      status: s.status,
      max_depth: s.maxDepth,
      frontier: s.frontier,
      visited: s.visited,
      completed_branches: s.completedBranches,
      exhausted_branches: s.exhaustedBranches,
      blocker: s.blocker ?? null,
      verification_state: params.verificationState ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.runId)
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId);

  if (error) throw error;
}

export async function persistPatternHopEvidence(params: {
  supabase: SupabaseClient;
  runId: string;
  userId: string;
  projectId: string;
  evidence: PatternHopEvidence[];
}): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const item of params.evidence) {
    const row = {
      run_id: params.runId,
      user_id: params.userId,
      project_id: params.projectId,
      source: item.source,
      source_thread_id: item.sourceThreadId ?? null,
      source_message_id: item.sourceMessageId ?? null,
      source_artifact_id: item.sourceArtifactId ?? null,
      speaker: item.speaker ?? null,
      evidence_type: item.evidenceType,
      content: item.content,
      occurred_at: item.occurredAt ?? null,
      chronology_rank: item.chronologyRank ?? null,
      confidence: item.confidence,
      epistemic_status: item.epistemicStatus,
      metadata: { client_evidence_id: item.id },
    };

    let existingQuery = params.supabase
      .from("arbor_pattern_hop_evidence")
      .select("id")
      .eq("run_id", params.runId)
      .eq("source", item.source)
      .eq("content", item.content);

    existingQuery = item.sourceMessageId
      ? existingQuery.eq("source_message_id", item.sourceMessageId)
      : existingQuery.is("source_message_id", null);

    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      ids.set(item.id, String(existing.id));
      continue;
    }

    const { data, error } = await params.supabase
      .from("arbor_pattern_hop_evidence")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    ids.set(item.id, String(data.id));
  }

  return ids;
}

export async function persistPatternHopEdges(params: {
  supabase: SupabaseClient;
  runId: string;
  idMap: Map<string, string>;
  edges: PatternHopEdge[];
}) {
  if (!params.edges.length) return;

  const rows = params.edges.map((edge) => ({
    run_id: params.runId,
    from_evidence_id: edge.fromEvidenceId
      ? params.idMap.get(edge.fromEvidenceId) ?? edge.fromEvidenceId
      : null,
    to_evidence_id: params.idMap.get(edge.toEvidenceId) ?? edge.toEvidenceId,
    originating_clue: edge.originatingClue,
    relationship: edge.relationship,
    hop_depth: edge.hopDepth,
    confidence: edge.confidence,
    epistemic_status: edge.epistemicStatus,
    rationale: edge.rationale,
  }));

  for (const row of rows) {
    let existingQuery = params.supabase
      .from("arbor_pattern_hop_edges")
      .select("id")
      .eq("run_id", row.run_id)
      .eq("to_evidence_id", row.to_evidence_id)
      .eq("relationship", row.relationship)
      .eq("hop_depth", row.hop_depth);

    existingQuery = row.from_evidence_id
      ? existingQuery.eq("from_evidence_id", row.from_evidence_id)
      : existingQuery.is("from_evidence_id", null);

    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) continue;

    const { error } = await params.supabase
      .from("arbor_pattern_hop_edges")
      .insert(row);

    if (error) throw error;
  }
}


export async function loadPatternHopEvidence(params: {
  supabase: SupabaseClient;
  runId: string;
  userId: string;
  projectId: string;
}): Promise<PatternHopEvidence[]> {
  const { data, error } = await params.supabase
    .from("arbor_pattern_hop_evidence")
    .select(
      "id,source,source_thread_id,source_message_id,source_artifact_id,speaker,evidence_type,content,occurred_at,chronology_rank,confidence,epistemic_status,metadata",
    )
    .eq("run_id", params.runId)
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .order("occurred_at", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id:
      typeof row.metadata?.client_evidence_id === "string"
        ? row.metadata.client_evidence_id
        : String(row.id),
    source: String(row.source),
    sourceThreadId: row.source_thread_id
      ? String(row.source_thread_id)
      : null,
    sourceMessageId: row.source_message_id
      ? String(row.source_message_id)
      : null,
    sourceArtifactId: row.source_artifact_id
      ? String(row.source_artifact_id)
      : null,
    speaker: row.speaker ? String(row.speaker) : null,
    evidenceType: String(row.evidence_type),
    content: String(row.content),
    occurredAt: row.occurred_at ?? null,
    chronologyRank:
      row.chronology_rank == null ? null : Number(row.chronology_rank),
    confidence: Number(row.confidence ?? 0.5),
    epistemicStatus: row.epistemic_status,
  }));
}

export async function loadPatternHopEdges(params: {
  supabase: SupabaseClient;
  runId: string;
}): Promise<PatternHopEdge[]> {
  const { data: evidenceRows, error: evidenceError } = await params.supabase
    .from("arbor_pattern_hop_evidence")
    .select("id,metadata")
    .eq("run_id", params.runId);

  if (evidenceError) throw evidenceError;

  const clientIdByDbId = new Map(
    (evidenceRows ?? []).map((row: any) => [
      String(row.id),
      typeof row.metadata?.client_evidence_id === "string"
        ? row.metadata.client_evidence_id
        : String(row.id),
    ]),
  );

  const { data, error } = await params.supabase
    .from("arbor_pattern_hop_edges")
    .select(
      "from_evidence_id,to_evidence_id,originating_clue,relationship,hop_depth,confidence,epistemic_status,rationale",
    )
    .eq("run_id", params.runId)
    .order("hop_depth", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    fromEvidenceId: row.from_evidence_id
      ? clientIdByDbId.get(String(row.from_evidence_id)) ??
        String(row.from_evidence_id)
      : null,
    toEvidenceId:
      clientIdByDbId.get(String(row.to_evidence_id)) ??
      String(row.to_evidence_id),
    originatingClue: String(row.originating_clue),
    relationship: String(row.relationship),
    hopDepth: Number(row.hop_depth),
    confidence: Number(row.confidence ?? 0.5),
    epistemicStatus: row.epistemic_status,
    rationale: String(row.rationale),
  }));
}
