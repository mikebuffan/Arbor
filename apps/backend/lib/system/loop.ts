import { runMemoryDecay } from "@/lib/tasks/decay";
import { runReflectionJob } from "@/lib/tasks/reflection";
import { runMemorySync } from "@/lib/tasks/sync";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logMemoryEvent } from "@/lib/memory/logger";

const LOCK_TABLE = "system_locks";
const LOOP_INTERVAL_MS = 1000 * 60 * 10;

export async function fireflyHeartbeat() {
  const client = supabaseAdmin();
  const lockName = "firefly_heartbeat";
  const now = new Date().toISOString();

  const { data: existing } = await client
    .from(LOCK_TABLE)
    .select("locked_at,is_active")
    .eq("name", lockName)
    .eq("is_active", true)
    .maybeSingle();

  if (existing?.locked_at) {
    const last = new Date(existing.locked_at).getTime();
    const age = Date.now() - last;
    if (age < LOOP_INTERVAL_MS / 2) {
      console.log("[firefly-loop] Skipping: active lock.");
      return;
    }
  }

  await client.from(LOCK_TABLE).upsert({ name: lockName, locked_at: now, is_active: true });

  try {
    console.log("[firefly-loop] Heartbeat tick...");

    const { data: projectRows } = await client.from("projects").select("id,user_id");
    const userIds = Array.from(new Set((projectRows ?? []).map((p: any) => p.user_id).filter(Boolean)));

    for (const userId of userIds) {
      await runMemoryDecay(userId);
      await runReflectionJob(userId, null);
    }

    for (const p of projectRows ?? []) {
      await runMemorySync((p as any).id);
    }

    await logMemoryEvent("system_heartbeat", {
      users: userIds.length,
      projects: projectRows?.length ?? 0,
      timestamp: now,
    });

    console.log("[firefly-loop] Heartbeat complete");
  } catch (err: any) {
    console.error("[firefly-loop] Error during loop:", err);
    await logMemoryEvent("system_heartbeat_error", { error: err.message });
  } finally {
    await client
      .from(LOCK_TABLE)
      .update({ released_at: new Date().toISOString(), is_active: false })
      .eq("name", lockName);
  }
}
