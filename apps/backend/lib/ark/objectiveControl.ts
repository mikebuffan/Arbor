import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseArkStore } from "./supabaseStore";

export type ArkObjectiveControlAction = "cancel" | "resume";

export async function controlOwnedArkObjective(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  objectiveId: string;
  action: ArkObjectiveControlAction;
  now?: string;
}) {
  await assertProjectOwnedByUser(
    input.supabase,
    input.userId,
    input.projectId,
  );

  const { data: owned, error: readError } = await input.supabase
    .from("ark_objectives")
    .select("id,user_id,project_id,status")
    .eq("id", input.objectiveId)
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (readError) throw readError;
  if (
    !owned ||
    owned.id !== input.objectiveId ||
    owned.user_id !== input.userId ||
    owned.project_id !== input.projectId
  ) {
    throw new Error("ark_objective_not_found");
  }

  // Privileged authority begins only after exact user/project/objective scope
  // has been proven through the request-scoped user client.
  const store = new SupabaseArkStore(supabaseAdmin());
  const now = input.now ?? new Date().toISOString();
  const objective = input.action === "cancel"
    ? await store.cancelObjective({ objectiveId: input.objectiveId, now })
    : await store.resumeBlockedObjective({ objectiveId: input.objectiveId, now });

  if (
    objective.id !== input.objectiveId ||
    objective.userId !== input.userId ||
    objective.projectId !== input.projectId
  ) {
    throw new Error("ark_objective_control_scope_mismatch");
  }

  return objective;
}
