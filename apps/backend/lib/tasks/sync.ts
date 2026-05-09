import { supabaseAdmin } from "@/lib/supabase/admin";
import { logMemoryEvent } from "@/lib/memory/logger";

export async function runMemorySync(projectId: string) {
  const client = supabaseAdmin();

  const { data, error } = await client
    .from("memory_items")
    .select("id, project_id, key, value")
    .eq("project_id", projectId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw error;

  await logMemoryEvent("sync_complete", { projectId, syncedCount: data?.length ?? 0 });
  return data?.length ?? 0;
}
