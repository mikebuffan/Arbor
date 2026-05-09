import { reflectOnMemoryCluster } from "@/lib/memory/reflection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logMemoryEvent } from "@/lib/memory/logger";

export async function runReflectionJob(userId: string, projectId: string | null) {
  const client = supabaseAdmin();
  let q = client
    .from("memory_items")
    .select("key")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  q = projectId ? q.eq("project_id", projectId) : q;

  const { data, error } = await q;
  if (error) throw error;

  const keys = data?.map((d: any) => d.key).filter(Boolean) ?? [];
  if (!keys.length) return;

  const result = await reflectOnMemoryCluster(userId, projectId, keys);
  await logMemoryEvent("reflection_job_complete", { userId, summary: result?.summary });
}
