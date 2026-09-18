import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkJobStatus =
  | "queued" | "running" | "checkpointed" | "blocked" | "complete" | "failed";

export type WorkJob = {
  jobId: string;
  parentGoal: string;
  status: WorkJobStatus;
  nextAction: string | null;
  unresolvedWork: string[];
  completionCriteria: string[];
  checkpoint: unknown;
  revision: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    : [];
}

function hydrate(row: Record<string, unknown>): WorkJob {
  return {
    jobId: String(row.job_id),
    parentGoal: String(row.parent_goal),
    status: String(row.status) as WorkJobStatus,
    nextAction: typeof row.next_action === "string" ? row.next_action : null,
    unresolvedWork: strings(row.unresolved_work),
    completionCriteria: strings(row.completion_criteria),
    checkpoint: row.checkpoint ?? null,
    revision: Number(row.revision ?? 0),
    leaseOwner: typeof row.lease_owner === "string" ? row.lease_owner : null,
    leaseExpiresAt:
      typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
  };
}

export async function enqueueWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string;
  parentGoal: string; nextAction?: string; unresolvedWork?: string[];
  completionCriteria?: string[];
}): Promise<WorkJob> {
  const { data, error } = await input.supabase.from("arbor_work_jobs").insert({
    user_id: input.userId, project_id: input.projectId,
    parent_goal: input.parentGoal, status: "queued",
    next_action: input.nextAction ?? null,
    unresolved_work: input.unresolvedWork ?? [],
    completion_criteria: input.completionCriteria ?? [],
  }).select("*").single();
  if (error) throw error;
  return hydrate(data as Record<string, unknown>);
}

export async function claimWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string;
  workerId: string; leaseSeconds?: number;
}): Promise<WorkJob | null> {
  const { data, error } = await input.supabase.rpc("arbor_claim_work_job", {
    p_user_id: input.userId, p_project_id: input.projectId,
    p_worker_id: input.workerId, p_lease_seconds: input.leaseSeconds ?? 90,
  });
  if (error) throw error;
  if (!data) return null;
  return hydrate(data as Record<string, unknown>);
}

async function ownedUpdate(input: {
  supabase: SupabaseClient; userId: string; projectId: string; job: WorkJob;
  workerId: string; patch: Record<string, unknown>;
}): Promise<WorkJob> {
  const { data, error } = await input.supabase.from("arbor_work_jobs")
    .update({ ...input.patch, updated_at: new Date().toISOString(), revision: input.job.revision + 1 })
    .eq("job_id", input.job.jobId).eq("user_id", input.userId)
    .eq("project_id", input.projectId).eq("lease_owner", input.workerId)
    .eq("revision", input.job.revision).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("work_job_lease_or_revision_conflict");
  return hydrate(data as Record<string, unknown>);
}

export function heartbeatWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string; job: WorkJob;
  workerId: string; leaseSeconds?: number;
}) {
  const now = Date.now();
  return ownedUpdate({ ...input, patch: {
    last_heartbeat_at: new Date(now).toISOString(),
    lease_expires_at: new Date(now + (input.leaseSeconds ?? 90) * 1000).toISOString(),
  }});
}

export function checkpointWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string; job: WorkJob;
  workerId: string; nextAction: string; unresolvedWork: string[]; checkpoint?: unknown;
}) {
  return ownedUpdate({ ...input, patch: {
    status: "checkpointed", next_action: input.nextAction,
    unresolved_work: input.unresolvedWork, checkpoint: input.checkpoint ?? null,
    lease_owner: null, lease_expires_at: null,
  }});
}

export function completeWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string; job: WorkJob; workerId: string;
}) {
  return ownedUpdate({ ...input, patch: {
    status: "complete", next_action: null, unresolved_work: [],
    lease_owner: null, lease_expires_at: null, last_error: null,
  }});
}

export function blockWorkJob(input: {
  supabase: SupabaseClient; userId: string; projectId: string; job: WorkJob;
  workerId: string; reason: string; unresolvedWork: string[];
}) {
  return ownedUpdate({ ...input, patch: {
    status: "blocked", unresolved_work: input.unresolvedWork,
    last_error: input.reason, lease_owner: null, lease_expires_at: null,
  }});
}
