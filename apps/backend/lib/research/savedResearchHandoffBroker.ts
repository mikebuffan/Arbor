import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  recordSavedResearchHandoff,
  type SavedResearchHandoff,
} from "./savedResearchHandoff";

export async function recordAuthorizedSavedResearchHandoff(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  handoff: SavedResearchHandoff;
  workerId: string;
}) {
  // Ordinary request-scoped ownership proof MUST complete before a privileged
  // client is acquired. The broker rechecks this even if a route already did.
  await assertProjectOwnedByUser(
    input.supabase,
    input.userId,
    input.projectId,
  );

  if (process.env.ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF !== "true") {
    throw new Error("saved_research_handoff_disabled");
  }

  const {
    data: { user },
    error,
  } = await input.supabase.auth.getUser();
  const grants = user?.app_metadata?.arbor_saved_research_handoff;
  if (
    error ||
    user?.id !== input.userId ||
    !Array.isArray(grants?.project_ids) ||
    !grants.project_ids.includes(input.projectId)
  ) {
    throw new Error("saved_research_handoff_not_granted");
  }

  const db = supabaseAdmin();
  return recordSavedResearchHandoff({
    db,
    ownerId: input.userId,
    projectId: input.projectId,
    handoff: input.handoff,
    workerId: input.workerId,
  });
}
