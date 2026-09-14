import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAgencyState } from "@/lib/arbor/agency/state";
import {
  prioritizeCorrections,
} from "@/lib/arbor/continuity/runtimeMemoryProjection";
import type {
  ArborCorrection,
  ArborRuntimeState,
} from "@/lib/arbor/runtime/runtimeState";
import {
  getMemoryContext,
  type RetrievedMemoryItem,
} from "@/lib/memory/retrieval";

type ConversationStateRow = {
  conversation_id: string;
  state: ArborRuntimeState | null;
  updated_at: string;
};

function compactMemory(item: RetrievedMemoryItem) {
  return {
    id: item.id,
    key: item.key,
    content: item.content_text,
    tier: item.tier,
    scope: item.scope,
    projectId: item.project_id,
    conversationId: item.conversation_id,
    importance: item.importance,
    confidence: item.confidence,
    pinned: item.pinned,
    locked: item.locked,
    similarity: item.similarity ?? null,
    updatedAt: item.updated_at,
  };
}

function uniqueStrings(values: string[], max = 20) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, " ");
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out.slice(-max);
}

async function loadProjectCorrections(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}) {
  const { data, error } = await input.supabase
    .from("arbor_conversation_state")
    .select("conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = (data ?? []) as ConversationStateRow[];
  const corrections: ArborCorrection[] = [];

  for (const row of rows) {
    if (!row.state?.corrections?.length) continue;
    corrections.push(...row.state.corrections);
  }

  return prioritizeCorrections(corrections, 20);
}

async function loadExactConversationRuntime(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string | null;
}) {
  if (!input.conversationId) return null;

  const { data, error } = await input.supabase
    .from("arbor_conversation_state")
    .select("conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("conversation_id", input.conversationId)
    .maybeSingle();

  if (error) throw error;
  return (data as ConversationStateRow | null)?.state ?? null;
}

export type ArborMemoryGatewaySnapshot = {
  schemaVersion: 1;
  projectId: string;
  conversationId: string | null;
  activeObjective: {
    goal: string;
    status: string;
    currentStep: number;
    blocker: string | null;
  } | null;
  openLoops: string[];
  corrections: Array<{
    id: string;
    kind: ArborCorrection["kind"];
    value: string;
    source: ArborCorrection["source"];
    observedAt: string;
    confidence: number;
    protected: boolean;
  }>;
  exactConversation: {
    currentGoal: string | null;
    activeSubsystem: ArborRuntimeState["activeSubsystem"];
    channel: ArborRuntimeState["channel"];
    updatedAt: string;
  } | null;
  identityAnchors: ReturnType<typeof compactMemory>[];
  relevantMemories: ReturnType<typeof compactMemory>[];
  sensitiveAvailableCount: number;
  diagnostics: {
    memoryKeysUsed: string[];
    exactConversationFound: boolean;
    projectCorrectionCount: number;
    projectAgencyFound: boolean;
  };
};

export async function buildArborMemoryGatewaySnapshot(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  query: string;
}): Promise<ArborMemoryGatewaySnapshot> {
  const conversationId = input.conversationId ?? null;

  const [
    agency,
    exactConversation,
    projectCorrections,
    memory,
  ] = await Promise.all([
    loadAgencyState({
      supabase: input.supabase,
      userId: input.userId,
      projectId: input.projectId,
    }),
    loadExactConversationRuntime({
      supabase: input.supabase,
      userId: input.userId,
      projectId: input.projectId,
      conversationId,
    }),
    loadProjectCorrections({
      supabase: input.supabase,
      userId: input.userId,
      projectId: input.projectId,
    }),
    getMemoryContext({
      supabase: input.supabase,
      authedUserId: input.userId,
      projectId: input.projectId,
      conversationId,
      latestUserText: input.query,
      useVectorSearch: input.query.trim().length >= 3,
      useCache: false,
    }),
  ]);

  const exactCorrections =
    exactConversation?.corrections ?? [];

  const corrections = prioritizeCorrections(
    [
      ...projectCorrections,
      ...exactCorrections,
    ],
    20,
  );

  const openLoops = uniqueStrings([
    ...(agency?.unresolvedWork ?? []),
    ...(exactConversation?.agency?.unresolvedWork ?? []),
  ]);

  // Core identity memories are deterministic context. Normal memory remains
  // relevance-ranked. Sensitive/user-trigger-only content is intentionally
  // withheld from this read-only gateway v1.
  const identityAnchors = memory.core
    .slice(0, 12)
    .map(compactMemory);

  const identityIds = new Set(
    identityAnchors.map((item) => item.id),
  );

  const relevantMemories = [
    ...memory.core,
    ...memory.normal,
  ]
    .filter((item) => !identityIds.has(item.id))
    .slice(0, 18)
    .map(compactMemory);

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    conversationId,
    activeObjective:
      agency && (
        agency.status === "active" ||
        agency.status === "blocked"
      )
        ? {
            goal: agency.goal,
            status: agency.status,
            currentStep: agency.currentStep,
            blocker: agency.blocker ?? null,
          }
        : null,
    openLoops,
    corrections: corrections.map((item) => ({
      id: item.id,
      kind: item.kind,
      value: item.value,
      source: item.source,
      observedAt: item.observedAt,
      confidence: item.confidence,
      protected: item.protected,
    })),
    exactConversation: exactConversation
      ? {
          currentGoal: exactConversation.currentGoal,
          activeSubsystem: exactConversation.activeSubsystem,
          channel: exactConversation.channel,
          updatedAt: exactConversation.updatedAt,
        }
      : null,
    identityAnchors,
    relevantMemories,
    sensitiveAvailableCount: memory.sensitive.length,
    diagnostics: {
      memoryKeysUsed: memory.keysUsed,
      exactConversationFound: Boolean(exactConversation),
      projectCorrectionCount: projectCorrections.length,
      projectAgencyFound: Boolean(agency),
    },
  };
}
