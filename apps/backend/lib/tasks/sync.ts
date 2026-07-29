import { supabaseAdmin } from "@/lib/supabase/admin";

export type CompletedMaintenanceTask = {
  status: "completed";
  processed: number;
};

export async function runMemorySync(
  projectId: string,
): Promise<CompletedMaintenanceTask> {
  const client = supabaseAdmin();

  const { data, error } = await client
    .from("memory_items")
    .select("id, project_id, key, value")
    .eq("project_id", projectId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(500);

  if (error) throw error;

  return {
    status: "completed",
    processed: data?.length ?? 0,
  };
}
