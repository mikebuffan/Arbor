import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertConversationOwnedByUser, assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { readArkProjectSnapshot } from "@/lib/ark/readModel";
import { projectRuntimeStartup } from "@/lib/arbor/runtime/hostProjection";
import { loadLatestRuntimeState, loadRuntimeState } from "@/lib/arbor/runtime/runtimeStateStore";
import { loadDurableBehaviorCorrections } from "@/lib/arbor/runtime/correctionPromotion";
import { mergeCorrectionSnapshots } from "@/lib/arbor/runtime/runtimeState";
import { behaviorCorrections } from "@/lib/arbor/runtime/corrections";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { renderCanonicalIdentityAnchor } from "@/lib/arbor/selfModel/canonicalIdentityAnchor";
import { arkMcpUserContext } from "./context";
import { isArkMcpSubmissionEnabled, ARK_READ_TASK_SUBMIT_PERMISSION } from "./taskPermissions";
import { isArkAcceptanceSubmissionEnabled, ARK_ACCEPTANCE_SUBMIT_PERMISSION } from "./taskPermissions";
import { readArborMemoryRecall } from "@/lib/memory/readRecall";

const ReadOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const JsonRecord = z.record(z.string(), z.unknown());

function result<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export function registerArkReadTools(server: McpServer): void {
  server.registerTool(
    "get_arbor_profile",
    {
      title: "Get Arbor Profile",
      description: "Return the authenticated Arbor identity attached to this connection.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        userId: z.string().uuid(),
        email: z.string().email().nullable(),
        subsystem: z.literal("ARK"),
        access: z.enum(["read-only", "read-and-submit-read-tasks", "read-and-submit-behavior-tests"]),
        canSubmitReadTasks: z.boolean(),
        canSubmitBehaviorTests: z.boolean(),
        oauthClientId: z.string().nullable(),
      }),
      annotations: ReadOnlyAnnotations,
      _meta: { "openai/profile": true },
    },
    async (_input, ctx) => {
      const { userId, email } = arkMcpUserContext(ctx);
      const auth = ctx.http?.authInfo;
      const canSubmit = isArkMcpSubmissionEnabled() && auth?.scopes.includes(ARK_READ_TASK_SUBMIT_PERMISSION)
        && Array.isArray(auth.extra?.arkReadTaskProjectIds) && auth.extra.arkReadTaskProjectIds.length > 0;
      const canSubmitBehaviorTests = isArkAcceptanceSubmissionEnabled() && auth?.scopes.includes(ARK_ACCEPTANCE_SUBMIT_PERMISSION)
        && Array.isArray(auth.extra?.arkAcceptanceProjectIds) && auth.extra.arkAcceptanceProjectIds.length > 0;
      return result({ userId, email, subsystem: "ARK" as const,
        access: canSubmitBehaviorTests ? "read-and-submit-behavior-tests" as const
          : canSubmit ? "read-and-submit-read-tasks" as const : "read-only" as const,
        canSubmitReadTasks: Boolean(canSubmit),
        canSubmitBehaviorTests: Boolean(canSubmitBehaviorTests),
        oauthClientId: typeof auth?.extra?.oauthClientId === "string" ? auth.extra.oauthClientId : null });
    },
  );

  server.registerTool(
    "get_arbor_memory_recall",
    {
      title: "Recall Arbor Memories",
      description: "Read bounded owned archive excerpts, episode summaries, and eligible durable memories for the current request. Reports archive inventory separately from matches. Read-only lexical lookup; no external model requests, imports, or writes.",
      inputSchema: z.object({projectId: z.string().uuid(), conversationId: z.string().uuid().optional(),
        query: z.string().trim().min(3).max(2000)}),
      outputSchema: z.object({projectId: z.string().uuid(), query: z.string(), archive: JsonRecord,
        episodes: JsonRecord, memories: JsonRecord, recallPrompt: z.string()}),
      annotations: ReadOnlyAnnotations,
    },
    async ({projectId, conversationId, query}, ctx) => {
      const {userId, supabase} = arkMcpUserContext(ctx);
      await assertProjectOwnedByUser(supabase, userId, projectId);
      if (conversationId) await assertConversationOwnedByUser({supabase, userId, projectId, conversationId});
      return result(await readArborMemoryRecall({supabase, userId, projectId, conversationId, query}));
    },
  );

  server.registerTool(
    "list_arbor_projects",
    {
      title: "List Arbor Projects",
      description: "List Arbor projects owned by the authenticated user so another ARK read can be scoped safely.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      outputSchema: z.object({
        projects: z.array(JsonRecord),
      }),
      annotations: ReadOnlyAnnotations,
    },
    async ({ limit }, ctx) => {
      const { userId, supabase } = arkMcpUserContext(ctx);
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,persona_id,framework_version,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return result({ projects: (data ?? []) as Array<Record<string, unknown>> });
    },
  );

  server.registerTool(
    "get_ark_status",
    {
      title: "Get ARK Status",
      description: "Read the latest durable ARK objectives and tasks for one owned Arbor project. This tool cannot start or modify work.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        objectiveLimit: z.number().int().min(1).max(20).default(10),
      }),
      outputSchema: z.object({
        available: z.boolean(),
        objectives: z.array(JsonRecord),
        tasks: z.array(JsonRecord),
        checkpoints: z.array(JsonRecord),
        events: z.array(JsonRecord),
        capturedAt: z.string(),
        truncated: z.boolean(),
      }),
      annotations: ReadOnlyAnnotations,
    },
    async ({ projectId, objectiveLimit }, ctx) => {
      const { userId, supabase } = arkMcpUserContext(ctx);
      await assertProjectOwnedByUser(supabase, userId, projectId);

      const snapshot = await readArkProjectSnapshot({
        supabase,
        userId,
        projectId,
        objectiveLimit,
      });
      const tasks = snapshot.tasks.slice(0, 100);

      return result({
        ...snapshot,
        tasks,
        truncated: tasks.length < snapshot.tasks.length,
      });
    },
  );

  server.registerTool(
    "get_arbor_continuity",
    {
      title: "Get Arbor Continuity",
      description: "Read the shared Arbor identity baseline, durable corrections, and latest owned runtime continuity for a project or conversation. Missing conversation history remains unavailable; identity baseline is independent of history.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        conversationId: z.string().uuid().optional(),
      }),
      outputSchema: z.object({
        available: z.boolean(),
        identityAnchor: z.string(),
        projectId: z.string().uuid(),
        conversationId: z.string().uuid().nullable(),
        surface: z.enum(["text", "voice"]).nullable(),
        authority: z.enum(["arbor", "annabelle"]).nullable(),
        currentGoal: z.string().nullable(),
        lastMeaningfulUserTurn: z.string().nullable(),
        lastMeaningfulArborTurn: z.string().nullable(),
        unresolvedWork: z.array(JsonRecord),
        behavioralCorrections: z.array(z.string()),
        acousticCorrections: z.array(z.string()),
        continuityPrompt: z.string().nullable(),
        updatedAt: z.string().nullable(),
      }),
      annotations: ReadOnlyAnnotations,
    },
    async ({ projectId, conversationId }, ctx) => {
      const { userId, supabase } = arkMcpUserContext(ctx);
      await assertProjectOwnedByUser(supabase, userId, projectId);

      if (conversationId) {
        await assertConversationOwnedByUser({ supabase, userId, projectId, conversationId });
      }

      const state = conversationId
        ? await loadRuntimeState({ supabase, userId, projectId, conversationId })
        : await loadLatestRuntimeState({ supabase, userId, projectId });
      const durableCorrections = await loadDurableBehaviorCorrections({ supabase, userId });

      if (!state) {
        return result({
          available: false,
          identityAnchor: renderCanonicalIdentityAnchor(),
          projectId,
          conversationId: conversationId ?? null,
          surface: null,
          authority: null,
          currentGoal: null,
          lastMeaningfulUserTurn: null,
          lastMeaningfulArborTurn: null,
          unresolvedWork: [],
          behavioralCorrections: behaviorCorrections(durableCorrections),
          acousticCorrections: [],
          continuityPrompt: durableCorrections.length
            ? promptDataBlock("DURABLE ARBOR BEHAVIOR CORRECTIONS", behaviorCorrections(durableCorrections))
            : null,
          updatedAt: null,
        });
      }

      const projection = projectRuntimeStartup({
        ...state, corrections: mergeCorrectionSnapshots([durableCorrections, state.corrections ?? []]),
      });
      return result({
        available: true,
        identityAnchor: renderCanonicalIdentityAnchor(),
        projectId,
        conversationId: projection.hostState.conversationId,
        surface: projection.hostState.surface,
        authority: projection.hostState.authority,
        currentGoal: projection.hostState.currentGoal,
        lastMeaningfulUserTurn: projection.hostState.lastMeaningfulUserTurn,
        lastMeaningfulArborTurn: projection.hostState.lastMeaningfulArborTurn,
        unresolvedWork: projection.hostState.unresolvedWork,
        behavioralCorrections: projection.behaviorCorrections,
        acousticCorrections: projection.acousticCorrections,
        continuityPrompt: projection.startup.promptBlock,
        updatedAt: projection.hostState.updatedAt,
      });
    },
  );
}
