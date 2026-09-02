import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runMemoryDecay } from "@/lib/tasks/decay";
import { runReflectionJob } from "@/lib/tasks/reflection";
import { runMemorySync } from "@/lib/tasks/sync";

const LOCK_TABLE = "system_locks";
const HEARTBEAT_TABLE = "system_heartbeats";
const LOCK_NAME = "firefly_heartbeat";
const LOCK_STALE_AFTER_MS = 1000 * 60 * 5;
const PROJECT_SCAN_LIMIT = 1000;

type SkippedTask = {
  status: "skipped";
  reason: string;
  processed: 0;
};

export type HeartbeatResult = {
  status: "completed" | "skipped";
  processedProjects: number;
  syncedMemories: number;
  tasks: {
    decay: SkippedTask;
    reflection: SkippedTask;
    sync: {
      status: "completed" | "skipped";
      processed: number;
      reason?: string;
    };
  };
};

type LockRow = {
  id: string;
  name: string;
  locked_at: string | null;
  released_at: string | null;
  is_active: boolean | null;
};

function isFreshActiveLock(lock: LockRow | null): boolean {
  if (!lock?.is_active) return false;

  const lockedAt = lock.locked_at ? Date.parse(lock.locked_at) : Number.NaN;
  if (!Number.isFinite(lockedAt)) return true;

  return Date.now() - lockedAt < LOCK_STALE_AFTER_MS;
}

async function acquireHeartbeatLock(
  client: SupabaseClient,
  now: string,
): Promise<boolean> {
  const { data: existing, error: readError } = await client
    .from(LOCK_TABLE)
    .select("id, name, locked_at, released_at, is_active")
    .eq("name", LOCK_NAME)
    .maybeSingle();

  if (readError) throw readError;
  if (isFreshActiveLock(existing as LockRow | null)) return false;

  const { error: lockError } = await client.from(LOCK_TABLE).upsert(
    {
      name: LOCK_NAME,
      locked_at: now,
      released_at: null,
      is_active: true,
    },
    { onConflict: "name" },
  );

  if (lockError) throw lockError;
  return true;
}

async function releaseHeartbeatLock(
  client: SupabaseClient,
  releasedAt: string,
  lockedAt: string,
): Promise<void> {
  const { error } = await client
    .from(LOCK_TABLE)
    .update({
      released_at: releasedAt,
      is_active: false,
    })
    .eq("name", LOCK_NAME)
    .eq("is_active", true)
    .eq("locked_at", lockedAt);

  if (error) throw error;
}

async function recordHeartbeat(
  client: SupabaseClient,
  status: "completed" | "failed" | "skipped",
  notes: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from(HEARTBEAT_TABLE).insert({
    status,
    processed_users: 0,
    notes: JSON.stringify(notes),
  });

  if (error) throw error;
}

async function loadProjectIds(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from("projects")
    .select("id")
    .order("id", { ascending: true })
    .limit(PROJECT_SCAN_LIMIT);

  if (error) throw error;
  if ((data?.length ?? 0) >= PROJECT_SCAN_LIMIT) {
    throw new Error("heartbeat_project_scan_limit_reached");
  }

  return (data ?? [])
    .map((project) => project.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

function skippedSync(reason: string): HeartbeatResult {
  return {
    status: "skipped",
    processedProjects: 0,
    syncedMemories: 0,
    tasks: {
      decay: {
        status: "skipped",
        reason: "memory_decay_schema_unavailable",
        processed: 0,
      },
      reflection: {
        status: "skipped",
        reason: "memory_reflections_table_absent",
        processed: 0,
      },
      sync: {
        status: "skipped",
        reason,
        processed: 0,
      },
    },
  };
}

export async function fireflyHeartbeat(): Promise<HeartbeatResult> {
  const client = supabaseAdmin();
  const startedAt = new Date().toISOString();
  const acquired = await acquireHeartbeatLock(client, startedAt);

  if (!acquired) {
    const result = skippedSync("active_heartbeat_lock");
    await recordHeartbeat(client, "skipped", result);
    return result;
  }

  let primaryFailure: unknown = null;

  try {
    const decay = await runMemoryDecay();
    const reflection = await runReflectionJob();
    const projectIds = await loadProjectIds(client);

    let syncedMemories = 0;
    for (const projectId of projectIds) {
      const sync = await runMemorySync(projectId);
      syncedMemories += sync.processed;
    }

    const result: HeartbeatResult = {
      status: "completed",
      processedProjects: projectIds.length,
      syncedMemories,
      tasks: {
        decay,
        reflection,
        sync: {
          status: "completed",
          processed: projectIds.length,
        },
      },
    };

    await recordHeartbeat(client, "completed", result);
    console.info("[firefly-loop] heartbeat completed");
    return result;
  } catch (error: unknown) {
    primaryFailure = error;

    try {
      await recordHeartbeat(client, "failed", {
        reason: "required_heartbeat_task_failed",
      });
    } catch {
      console.error("[firefly-loop] failed to record heartbeat failure");
    }

    throw error;
  } finally {
    try {
      await releaseHeartbeatLock(
        client,
        new Date().toISOString(),
        startedAt,
      );
    } catch (releaseError: unknown) {
      if (!primaryFailure) throw releaseError;
      console.error("[firefly-loop] failed to release heartbeat lock");
    }
  }
}
