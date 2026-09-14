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

export function assembleArborMemoryGatewaySnapshot(input: {
  projectId: string;
  conversationId: string | null;
  agency: Awaited<ReturnType<typeof loadAgencyState>>;
  exactConversation: ArborRuntimeState | null;
  projectCorrections: ArborCorrection[];
  memory: Awaited<ReturnType<typeof getMemoryContext>>;
}): ArborMemoryGatewaySnapshot {
  const corrections = prioritizeCorrections(
    [
      ...input.projectCorrections,
      ...(input.exactConversation?.corrections ?? []),
    ],
    20,
  );

  const openLoops = uniqueStrings([
    ...(input.agency?.unresolvedWork ?? []),
    ...(input.exactConversation?.agency?.unresolvedWork ?? []),
  ]);

  const identityAnchors = input.memory.core
    .slice(0, 12)
    .map(compactMemory);

  const identityIds = new Set(
    identityAnchors.map((item) => item.id),
  );

  const relevantMemories = [
    ...input.memory.core,
    ...input.memory.normal,
  ]
    .filter((item) => !identityIds.has(item.id))
    .slice(0, 18)
    .map(compactMemory);

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    conversationId: input.conversationId,
    activeObjective:
      input.agency && (
        input.agency.status === "active" ||
        input.agency.status === "blocked"
      )
        ? {
            goal: input.agency.goal,
            status: input.agency.status,
            currentStep: input.agency.currentStep,
            blocker: input.agency.blocker ?? null,
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
    exactConversation: input.exactConversation
      ? {
          currentGoal: input.exactConversation.currentGoal,
          activeSubsystem: input.exactConversation.activeSubsystem,
          channel: input.exactConversation.channel,
          updatedAt: input.exactConversation.updatedAt,
        }
      : null,
    identityAnchors,
    relevantMemories,
    sensitiveAvailableCount: input.memory.sensitive.length,
    diagnostics: {
      memoryKeysUsed: input.memory.keysUsed,
      exactConversationFound: Boolean(input.exactConversation),
      projectCorrectionCount: input.projectCorrections.length,
      projectAgencyFound: Boolean(input.agency),
    },
  };
}

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

  return assembleArborMemoryGatewaySnapshot({
    projectId: input.projectId,
    conversationId,
    agency,
    exactConversation,
    projectCorrections,
    memory,
  });
}
