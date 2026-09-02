import type { SupabaseClient } from "@supabase/supabase-js";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { correctMemoryItem } from "@/lib/memory/store";

export async function applyMemoryCorrection(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string | null;
  key: string;
  correctedValue: Record<string, unknown> | string;
}) {
  const { supabase, userId, projectId, key, correctedValue } = params;

  if (projectId) {
    await assertProjectOwnedByUser(supabase, userId, projectId);
  }

  return correctMemoryItem({
    supabase,
    authedUserId: userId,
    projectId,
    key: key.trim(),
    newValue: correctedValue,
  });
}
