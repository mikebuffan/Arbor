import type {
  ArkObjectiveStatus,
  ArkTaskDraft,
  ArkTaskStatus,
} from "./types";

const OBJECTIVE_TRANSITIONS: Record<ArkObjectiveStatus, ArkObjectiveStatus[]> = {
  queued: ["running", "blocked", "cancelled", "failed"],
  running: [
    "checkpointed",
    "blocked",
    "awaiting_verification",
    "failed",
    "cancelled",
  ],
  checkpointed: ["running", "blocked", "failed", "cancelled"],
  blocked: ["queued", "running", "cancelled", "failed"],
  awaiting_verification: ["running", "completed", "blocked", "failed"],
  completed: [],
  failed: ["queued", "cancelled"],
  cancelled: [],
};

const TASK_TRANSITIONS: Record<ArkTaskStatus, ArkTaskStatus[]> = {
  queued: ["running", "blocked", "cancelled"],
  running: ["checkpointed", "blocked", "completed", "failed", "queued"],
  checkpointed: ["running", "blocked", "cancelled"],
  blocked: ["queued", "cancelled", "failed"],
  completed: [],
  failed: ["queued", "cancelled"],
  cancelled: [],
};

export function assertArkObjectiveTransition(
  from: ArkObjectiveStatus,
  to: ArkObjectiveStatus,
): void {
  if (from === to) return;
  if (!OBJECTIVE_TRANSITIONS[from].includes(to)) {
    throw new Error(`ark_invalid_objective_transition:${from}:${to}`);
  }
}

export function assertArkTaskTransition(
  from: ArkTaskStatus,
  to: ArkTaskStatus,
): void {
  if (from === to) return;
  if (!TASK_TRANSITIONS[from].includes(to)) {
    throw new Error(`ark_invalid_task_transition:${from}:${to}`);
  }
}

export function validateArkTaskGraph(tasks: ArkTaskDraft[]): void {
  if (tasks.length === 0) throw new Error("ark_objective_requires_tasks");

  const keys = new Set<string>();
  const idempotencyKeys = new Set<string>();
  for (const task of tasks) {
    if (!task.taskKey.trim()) throw new Error("ark_task_key_required");
    if (keys.has(task.taskKey)) throw new Error(`ark_duplicate_task_key:${task.taskKey}`);
    if (idempotencyKeys.has(task.idempotencyKey)) {
      throw new Error(`ark_duplicate_idempotency_key:${task.idempotencyKey}`);
    }
    keys.add(task.taskKey);
    idempotencyKeys.add(task.idempotencyKey);
  }

  for (const task of tasks) {
    for (const dependency of task.dependencies ?? []) {
      if (!keys.has(dependency)) {
        throw new Error(`ark_unknown_dependency:${task.taskKey}:${dependency}`);
      }
      if (dependency === task.taskKey) {
        throw new Error(`ark_self_dependency:${task.taskKey}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byKey = new Map(tasks.map((task) => [task.taskKey, task]));

  function visit(key: string): void {
    if (visited.has(key)) return;
    if (visiting.has(key)) throw new Error(`ark_dependency_cycle:${key}`);
    visiting.add(key);
    for (const dependency of byKey.get(key)?.dependencies ?? []) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  }

  for (const key of keys) visit(key);
}
