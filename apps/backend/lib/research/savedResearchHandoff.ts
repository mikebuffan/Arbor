import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseArkStore } from "../ark/supabaseStore";
import { ArkExecutorRegistry } from "../ark/executorRegistry";
import { runArkWorkerCycle } from "../ark/runner";

const text = z.string().min(1).max(12000);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
/** Reported provenance is preserved, never promoted to independently verified evidence. */
export const SavedResearchHandoff = z.object({
  version: z.literal(1), runRef: z.string().min(1).max(200),
  artifacts: z.array(z.object({
    name: z.string().min(1).max(300), libraryFileId: z.string().regex(/^libfile_[a-zA-Z0-9_-]+$/),
    fileId: z.string().min(1).max(200), libraryVersion: z.number().int().nonnegative(),
    bytes: z.number().int().nonnegative(), sha256: sha,
  }).strict()).min(1).max(30),
  sources: z.array(z.object({
    identifier: z.string().min(1).max(300), url: z.string().url().max(2000),
    sha256: sha, physicalPages: z.number().int().positive(), inspectedPages: text,
    familyOverlap: text, accessUncertainty: text,
  }).strict()).min(1).max(100),
  observations: z.array(text).min(1).max(30),
  contradictions: z.array(text).max(30), uncertainty: z.array(text).min(1).max(30),
  nextQuestion: z.string().min(1).max(2000),
  evidenceStatus: z.literal("manual_observations_not_misconduct_findings"),
  saveVerification: z.literal("reported_library_receipt_requires_independent_recovery"),
}).strict();
export type SavedResearchHandoff = z.infer<typeof SavedResearchHandoff>;
export const SAVED_RESEARCH_HANDOFF_KIND = "research.saved-handoff";

export function parseSavedResearchHandoff(value: unknown): SavedResearchHandoff {
  const parsed = SavedResearchHandoff.parse(value);
  if (Buffer.byteLength(JSON.stringify(parsed), "utf8") > 256 * 1024)
    throw new Error("research_handoff_size_limit");
  if (new Set(parsed.artifacts.map(a => a.libraryFileId)).size !== parsed.artifacts.length)
    throw new Error("research_handoff_duplicate_artifact");
  return parsed;
}
export function savedResearchHandoffSha256(value: unknown): string {
  // Schema parsing fixes property order; source and question order is meaningful.
  return createHash("sha256").update(JSON.stringify(parseSavedResearchHandoff(value))).digest("hex");
}

/** Scope comes from trusted authorization, never from the handoff itself. */
export async function readSavedResearchCheckpoint(db: SupabaseClient, ownerId: string, projectId: string, objectiveId: string) {
  const { data: task, error } = await db.from("ark_tasks").select("id,objective_id,user_id,project_id,kind,payload,checkpoint_sequence,status")
    .eq("objective_id", objectiveId).eq("user_id", ownerId).eq("project_id", projectId)
    .eq("task_key", "saved-research").maybeSingle();
  if (error) throw error;
  if (!task) return null;
  if (task.objective_id !== objectiveId || task.user_id !== ownerId || task.project_id !== projectId ||
      task.kind !== SAVED_RESEARCH_HANDOFF_KIND) throw new Error("research_handoff_scope_mismatch");
  if (task.checkpoint_sequence === 0) return null;
  const { data: cp, error: cpError } = await db.from("ark_checkpoints").select("task_id,objective_id,sequence,state,next_action")
    .eq("task_id", task.id).eq("objective_id", objectiveId).eq("sequence", task.checkpoint_sequence).maybeSingle();
  if (cpError) throw cpError;
  if (!cp || cp.task_id !== task.id || cp.objective_id !== objectiveId || cp.sequence !== 1)
    throw new Error("research_handoff_checkpoint_missing");
  const handoff = parseSavedResearchHandoff(cp.state?.handoff);
  const digest = savedResearchHandoffSha256(handoff);
  if (cp.state?.handoffSha256 !== digest || task.payload?.handoffSha256 !== digest ||
      savedResearchHandoffSha256(task.payload?.handoff) !== digest || cp.next_action !== handoff.nextQuestion)
    throw new Error("research_handoff_checkpoint_mismatch");
  return { objectiveId, taskId: task.id as string, taskStatus: task.status as string, sequence: 1, handoffSha256: digest, handoff,
    nextQuestion: handoff.nextQuestion, researchCompletionVerified: false as const, executionRequested: false as const };
}

/** Only carries already reported findings. No provider, search, ingestion or publication. */
export function registerSavedResearchHandoffExecutor(registry: ArkExecutorRegistry, db: SupabaseClient) {
  registry.register(SAVED_RESEARCH_HANDOFF_KIND, async ({ claim }) => {
    if (claim.task.userId !== claim.objective.userId || claim.task.projectId !== claim.objective.projectId ||
        claim.task.objectiveId !== claim.objective.id) throw new Error("research_handoff_claim_scope_mismatch");
    const handoff = parseSavedResearchHandoff(claim.task.payload.handoff);
    const digest = savedResearchHandoffSha256(handoff);
    if (claim.task.payload.handoffSha256 !== digest) throw new Error("research_handoff_payload_mismatch");
    if (claim.task.checkpointSequence > 0) {
      const saved = await readSavedResearchCheckpoint(db, claim.task.userId, claim.task.projectId, claim.objective.id);
      if (!saved || saved.handoffSha256 !== digest) throw new Error("research_handoff_resume_mismatch");
      return { status: "completed", result: { ...saved, completionScope: "handoff_custody_only",
        verified: true, capability: SAVED_RESEARCH_HANDOFF_KIND } };
    }
    return { status: "checkpointed", checkpoint: { sequence: 1,
      state: { handoff, handoffSha256: digest, researchCompletionVerified: false, executionRequested: false },
      nextAction: handoff.nextQuestion, reason: "executor" } };
  });
}

/** Trusted host caller: exact objective only, one record-only checkpoint, stable content identity. */
export async function recordSavedResearchHandoff(input: {
  db: SupabaseClient; ownerId: string; projectId: string; handoff: unknown; workerId: string;
}) {
  const handoff = parseSavedResearchHandoff(input.handoff), digest = savedResearchHandoffSha256(handoff);
  const store = new SupabaseArkStore(input.db);
  const objective = await store.enqueueObjective({ userId: input.ownerId, projectId: input.projectId,
    goal: "Preserve reported saved research provenance and next question; no research execution",
    idempotencyKey: `saved-research:${digest}`, budget: { maxTasksPerCycle: 1, maxRuntimeMs: 10000, maxAttemptsPerTask: 3 },
    tasks: [{ taskKey: "saved-research", kind: SAVED_RESEARCH_HANDOFF_KIND,
      description: "Carry saved manual observations and uncertainty into one ARK checkpoint",
      idempotencyKey: `saved-research:${digest}`, maxAttempts: 3, payload: { handoff, handoffSha256: digest } }],
  });
  if (objective.userId !== input.ownerId || objective.projectId !== input.projectId)
    throw new Error("research_handoff_enqueue_scope_mismatch");
  const existing = await readSavedResearchCheckpoint(input.db, input.ownerId, input.projectId, objective.id);
  if (existing?.taskStatus === "completed") return { ...existing, replayed: true };
  const registry = new ArkExecutorRegistry(); registerSavedResearchHandoffExecutor(registry, input.db);
  const cycle = () => runArkWorkerCycle({ store, executors: registry, workerId: input.workerId, maxTasks: 1, objectiveId: objective.id,
    verifyCompletion: async (obj) => {
      const custody = await readSavedResearchCheckpoint(input.db, input.ownerId, input.projectId, obj.id);
      return { ok: custody?.taskStatus === "completed" && custody.handoffSha256 === digest,
        evidence: { completionScope: "handoff_custody_only", handoffSha256: digest, researchCompletionVerified: false } };
    } });
  if (!existing) await cycle();
  // Reload the checkpoint before completing custody. No queued research action is left behind.
  const checkpoint = await readSavedResearchCheckpoint(input.db, input.ownerId, input.projectId, objective.id);
  if (!checkpoint) throw new Error("research_handoff_not_confirmed_retry_same_content");
  if (checkpoint.taskStatus !== "completed") await cycle();
  const saved = await readSavedResearchCheckpoint(input.db, input.ownerId, input.projectId, objective.id);
  if (!saved || saved.taskStatus !== "completed") throw new Error("research_handoff_not_confirmed_retry_same_content");
  return { ...saved, replayed: existing !== null };
}
