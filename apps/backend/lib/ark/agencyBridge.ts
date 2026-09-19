import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseArkStore } from "./supabaseStore";
import type { ArkBudget, ArkObjective, ArkTaskDraft } from "./types";

export type ArkAgencyToolStep = {
  id: string;
  description: string;
  capability: string;
  arguments: Record<string, unknown>;
  dependencies?: string[];
  maxAttempts?: number;
};

/**
 * Persist an explicit Arbor tool plan as an ARK objective. ARK owns durable
 * execution state after this crossing; Arbor's conversational agency state is
 * not copied into a second mutable record.
 */
export async function enqueueArkAgencyToolPlan(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
  goal: string;
  planId: string;
  steps: ArkAgencyToolStep[];
  priority?: number;
  budget?: Partial<ArkBudget>;
}): Promise<ArkObjective> {
  const tasks: ArkTaskDraft[] = input.steps.map((step) => ({
    taskKey: step.id,
    kind: "arbor.agency-tool",
    description: step.description,
    dependencies: step.dependencies ?? [],
    maxAttempts: step.maxAttempts,
    idempotencyKey: `${input.planId}:${step.id}`,
    payload: {
      capability: step.capability,
      arguments: step.arguments,
      conversationId: input.conversationId ?? null,
      turnId: input.turnId,
    },
  }));

  return new SupabaseArkStore(input.supabase).enqueueObjective({
    userId: input.userId,
    projectId: input.projectId,
    goal: input.goal,
    priority: input.priority,
    budget: input.budget,
    idempotencyKey: input.planId,
    tasks,
  });
}
