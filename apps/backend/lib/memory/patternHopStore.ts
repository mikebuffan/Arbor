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

function nonblankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function recordObject(value: unknown): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function restoredEvidenceId(row: any): string {
  return nonblankString(row.metadata?.client_evidence_id)
    ? row.metadata.client_evidence_id : row.id;
}

function mapState(row: any): PatternHopState {
  // Never replace damaged durable progress with empty traversal lists. A
  // malformed checkpoint must fail before any research or checkpoint write.
  const stringList = (value: unknown) =>
    Array.isArray(value) && value.every(nonblankString);
  if (!nonblankString(row.objective) ||
      !Number.isInteger(row.max_depth) || row.max_depth < 1 || row.max_depth > 32 ||
      !Array.isArray(row.frontier) || !row.frontier.every((item: any) =>
        recordObject(item) && nonblankString(item.evidenceId) &&
        nonblankString(item.clue) && nonblankString(item.branch) &&
        Number.isInteger(item.depth) && item.depth >= 0 && item.depth <= row.max_depth) ||
      !stringList(row.visited) || !stringList(row.completed_branches) ||
      !stringList(row.exhausted_branches) ||
      !["active", "complete", "blocked", "exhausted"].includes(row.status) ||
      (row.blocker != null && typeof row.blocker !== "string") ||
      (row.conversation_id != null && !nonblankString(row.conversation_id)) ||
      !recordObject(row.seed ?? {}) || !recordObject(row.verification_state ?? {})) {
    throw new Error("pattern_hop_run_state_invalid");
  }
  return {
    objective: row.objective,
    maxDepth: row.max_depth,
    frontier: row.frontier,
    visited: row.visited,
    completedBranches: row.completed_branches,
    exhaustedBranches: row.exhausted_branches,
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

  if (!data || typeof data.id !== "string" || !data.id.trim() ||
      data.user_id !== params.userId ||
      data.project_id !== params.projectId ||
      data.conversation_id !== (params.conversationId ?? null))
    throw new Error("pattern_hop_run_insert_scope_invalid");

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
  // Reject an administrative or misrouted readback even when the query
  // was fully scoped; never resume a foreign run.
  if (!data || data.id !== params.runId ||
      data.user_id !== params.userId ||
      data.project_id !== params.projectId) return null;

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
  const { data, error } = await params.supabase
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
    .eq("project_id", params.projectId)
    .select("id,user_id,project_id")
    .maybeSingle();

  if (error) throw error;
  // An error-free zero-row UPDATE is not a saved checkpoint. Require the
  // updated row's identity before the caller acknowledges durable progress.
  if (!data || data.id !== params.runId ||
      data.user_id !== params.userId ||
      data.project_id !== params.projectId)
    throw new Error("pattern_hop_run_update_scope_invalid");
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
      .select("id,run_id,user_id,project_id,source,content,source_message_id")
      .eq("run_id", params.runId)
      .eq("user_id", params.userId)
      .eq("project_id", params.projectId)
      .eq("source", item.source)
      .eq("content", item.content);

    existingQuery = item.sourceMessageId
      ? existingQuery.eq("source_message_id", item.sourceMessageId)
      : existingQuery.is("source_message_id", null);

    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      if (typeof existing.id !== "string" || !existing.id ||
          existing.run_id !== params.runId ||
          existing.user_id !== params.userId ||
          existing.project_id !== params.projectId ||
          existing.source !== item.source ||
          existing.content !== item.content ||
          existing.source_message_id !== (item.sourceMessageId ?? null))
        throw new Error("pattern_hop_evidence_existing_scope_invalid");
      ids.set(item.id, existing.id);
      continue;
    }

    const { data, error } = await params.supabase
      .from("arbor_pattern_hop_evidence")
      .insert(row)
      .select("id,run_id,user_id,project_id")
      .single();

    if (error) throw error;
    if (!data || typeof data.id !== "string" || !data.id ||
        data.run_id !== params.runId ||
        data.user_id !== params.userId ||
        data.project_id !== params.projectId)
      throw new Error("pattern_hop_evidence_insert_scope_invalid");
    ids.set(item.id, data.id);
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

  // Only DB IDs produced by scoped evidence persistence may be endpoints.
  // Passing through arbitrary source IDs could link to an unrelated run.
  const rows = params.edges.map((edge) => {
    const to = params.idMap.get(edge.toEvidenceId);
    const from = edge.fromEvidenceId
      ? params.idMap.get(edge.fromEvidenceId) : null;
    if (!to || (edge.fromEvidenceId && !from))
      throw new Error("pattern_hop_edge_unverified_endpoint");
    return {
      run_id: params.runId,
      from_evidence_id: from,
      to_evidence_id: to,
      originating_clue: edge.originatingClue,
      relationship: edge.relationship,
      hop_depth: edge.hopDepth,
      confidence: edge.confidence,
      epistemic_status: edge.epistemicStatus,
      rationale: edge.rationale,
    };
  });

  for (const row of rows) {
    let existingQuery = params.supabase
      .from("arbor_pattern_hop_edges")
      .select("id,run_id,from_evidence_id,to_evidence_id,relationship,hop_depth")
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
    if (existing) {
      if (typeof existing.id !== "string" || !existing.id.trim() ||
          existing.run_id !== row.run_id ||
          existing.from_evidence_id !== row.from_evidence_id ||
          existing.to_evidence_id !== row.to_evidence_id ||
          existing.relationship !== row.relationship ||
          existing.hop_depth !== row.hop_depth)
        throw new Error("pattern_hop_edge_existing_identity_invalid");
      continue;
    }

    const { data, error } = await params.supabase
      .from("arbor_pattern_hop_edges")
      .insert(row)
      .select("id,run_id,from_evidence_id,to_evidence_id,relationship,hop_depth")
      .single();

    if (error) throw error;
    if (!data || typeof data.id !== "string" || !data.id.trim() ||
        data.run_id !== row.run_id ||
        data.from_evidence_id !== row.from_evidence_id ||
        data.to_evidence_id !== row.to_evidence_id ||
        data.relationship !== row.relationship ||
        data.hop_depth !== row.hop_depth)
      throw new Error("pattern_hop_edge_insert_identity_invalid");
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
      "id,run_id,user_id,project_id,source,source_thread_id,source_message_id,source_artifact_id,speaker,evidence_type,content,occurred_at,chronology_rank,confidence,epistemic_status,metadata",
    )
    .eq("run_id", params.runId)
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .order("occurred_at", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.filter((row: any) =>
    row && row.run_id === params.runId &&
    row.user_id === params.userId &&
    row.project_id === params.projectId &&
    typeof row.id === "string" && row.id.length > 0 &&
    typeof row.source === "string" && row.source.length > 0 &&
    typeof row.evidence_type === "string" && row.evidence_type.length > 0 &&
    typeof row.content === "string" && row.content.length > 0 &&
    ["direct", "derived", "hypothesis", "retrospective", "contradictory"]
      .includes(row.epistemic_status) &&
    Number.isFinite(Number(row.confidence ?? 0.5))
  ).map((row: any) => ({
    id: restoredEvidenceId(row),
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
  userId: string;
  projectId: string;
}): Promise<PatternHopEdge[]> {
  // Edges have a run reference, not owner/project columns. Establish their
  // allowed endpoints from a separately scoped evidence readback first.
  const { data: evidenceRows, error: evidenceError } = await params.supabase
    .from("arbor_pattern_hop_evidence")
    .select("id,run_id,user_id,project_id,metadata")
    .eq("run_id", params.runId)
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId);

  if (evidenceError) throw evidenceError;
  const ownedEvidence = Array.isArray(evidenceRows) ? evidenceRows.filter(row =>
    row && typeof row.id === "string" && row.id.length > 0 &&
    row.run_id === params.runId &&
    row.user_id === params.userId &&
    row.project_id === params.projectId) : [];
  if (!ownedEvidence.length) return [];

  const clientIdByDbId = new Map<string, string>(
    ownedEvidence.map(row => [
      row.id,
      restoredEvidenceId(row),
    ]),
  );

  const { data, error } = await params.supabase
    .from("arbor_pattern_hop_edges")
    .select(
      "run_id,from_evidence_id,to_evidence_id,originating_clue,relationship,hop_depth,confidence,epistemic_status,rationale",
    )
    .eq("run_id", params.runId)
    .order("hop_depth", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.filter(row =>
    row && row.run_id === params.runId &&
    typeof row.to_evidence_id === "string" &&
    clientIdByDbId.has(row.to_evidence_id) &&
    (row.from_evidence_id === null ||
      (typeof row.from_evidence_id === "string" &&
       clientIdByDbId.has(row.from_evidence_id))) &&
    typeof row.originating_clue === "string" &&
    typeof row.relationship === "string" &&
    Number.isInteger(row.hop_depth) && row.hop_depth >= 0 &&
    typeof row.rationale === "string" &&
    ["direct", "derived", "hypothesis"].includes(row.epistemic_status) &&
    Number.isFinite(Number(row.confidence ?? 0.5))
  ).map(row => ({
    fromEvidenceId: row.from_evidence_id === null
      ? null : clientIdByDbId.get(row.from_evidence_id)!,
    toEvidenceId: clientIdByDbId.get(row.to_evidence_id)!,
    originatingClue: row.originating_clue,
    relationship: row.relationship,
    hopDepth: row.hop_depth,
    confidence: Number(row.confidence ?? 0.5),
    epistemicStatus: row.epistemic_status as PatternHopEdge["epistemicStatus"],
    rationale: row.rationale,
  }));
}
