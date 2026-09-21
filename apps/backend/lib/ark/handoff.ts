import type { ArkReadSnapshot } from "./readModel";

type Row = Record<string, unknown>;

export type ArkHandoff = {
  version: 1;
  source: "ark_read_only";
  capturedAt: string;
  available: boolean;
  objective: null | { id: string; goal: string; status: string; updatedAt: string | null };
  nextAction: string | null;
  blocker: null | { kind: string | null; message: string; needsOwnerDecision: boolean };
  checkpoint: null | {
    id: string;
    sequence: number;
    nextAction: string;
    reason: string | null;
    createdAt: string | null;
  };
  lastEvent: null | {
    id: string;
    kind: string;
    createdAt: string;
  };
  taskCounts: {
    total: number;
    queued: number;
    running: number;
    checkpointed: number;
    blocked: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  completionEvidenceRecorded: boolean;
  /// A persisted "running" status is not a worker heartbeat.
  liveExecutionVerified: false;
};

const statuses = new Set([
  "queued",
  "running",
  "checkpointed",
  "blocked",
  "awaiting_verification",
  "completed",
  "failed",
  "cancelled",
]);

const decisionKinds = new Set([
  "external_authority",
  "missing_preference",
  "high_consequence_fork",
  "irreversible_action",
]);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const date = (value: unknown): string | null => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const id = (value: unknown): string | null =>
  (typeof value === "string" || typeof value === "number")
    ? String(value).trim() || null
    : null;

const emptyCounts = () => ({
  total: 0,
  queued: 0,
  running: 0,
  checkpointed: 0,
  blocked: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
});

function chooseObjective(objectives: Row[]): Row | null {
  const priority = [
    "running",
    "checkpointed",
    "blocked",
    "awaiting_verification",
    "queued",
    "failed",
    "completed",
    "cancelled",
  ];
  for (const status of priority) {
    const match = objectives.find(
      (row) => id(row.id) && text(row.goal) && row.status === status,
    );
    if (match) return match;
  }
  return null;
}

function recordedEvidence(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

/**
 * Deterministic, intentionally restricted carry-forward context for an
 * authenticated owner/project-scoped ARK read snapshot. Not a memory write,
 * worker lease, resumed run, authorization, or completion verifier.
 */
export function buildArkHandoff(snapshot: ArkReadSnapshot): ArkHandoff {
  const base: ArkHandoff = {
    version: 1,
    source: "ark_read_only",
    capturedAt: snapshot.capturedAt,
    available: snapshot.available,
    objective: null,
    nextAction: null,
    blocker: null,
    checkpoint: null,
    lastEvent: null,
    taskCounts: emptyCounts(),
    completionEvidenceRecorded: false,
    liveExecutionVerified: false,
  };

  if (!snapshot.available) return base;
  const objective = chooseObjective(snapshot.objectives);
  if (!objective) return base;
  const objectiveId = id(objective.id)!;
  const status = text(objective.status)!;

  const tasks = snapshot.tasks.filter(
    (row) => id(row.objective_id) === objectiveId,
  );
  const checkpoints = snapshot.checkpoints
    .filter((row) => id(row.objective_id) === objectiveId)
    .filter((row) => id(row.id) && text(row.next_action)
      && Number.isSafeInteger(row.sequence) && Number(row.sequence) > 0)
    .sort((a, b) => Number(b.sequence) - Number(a.sequence));
  const checkpoint = checkpoints[0];
  const events = snapshot.events
    .filter((row) => id(row.objective_id) === objectiveId)
    .filter((row) => id(row.id) && text(row.event_type) && date(row.created_at))
    .sort((a, b) =>
      Date.parse(String(b.created_at)) - Date.parse(String(a.created_at)));
  const event = events[0];

  const counts = emptyCounts();
  counts.total = tasks.length;
  for (const row of tasks) {
    switch (row.status) {
      case "queued": counts.queued += 1; break;
      case "running": counts.running += 1; break;
      case "checkpointed": counts.checkpointed += 1; break;
      case "blocked": counts.blocked += 1; break;
      case "completed": counts.completed += 1; break;
      case "failed": counts.failed += 1; break;
      case "cancelled": counts.cancelled += 1; break;
    }
  }

  let blocker: ArkHandoff["blocker"] = null;
  const rawBlocker = objective.blocker;
  if (status === "blocked") {
    const record = rawBlocker && typeof rawBlocker === "object" &&
      !Array.isArray(rawBlocker) ? rawBlocker as Row : null;
    const kind = text(record?.kind);
    const message = text(record?.message) ?? text(rawBlocker);
    blocker = {
      kind,
      message: message ?? "ARK reports a blocker without a concrete message.",
      needsOwnerDecision: kind !== null && decisionKinds.has(kind),
    };
  }

  const nextTask = ["running", "checkpointed", "queued"]
    .flatMap((state) => tasks.filter((row) => row.status === state))
    .map((row) => text(row.description) ?? text(row.task_key))
    .find((description) => description !== null) ?? null;

  const cp = checkpoint ? {
    id: id(checkpoint.id)!,
    sequence: Number(checkpoint.sequence),
    nextAction: text(checkpoint.next_action)!,
    reason: text(checkpoint.reason),
    createdAt: date(checkpoint.created_at),
  } : null;

  const nextAction =
    status === "awaiting_verification" ? "Verify recorded objective completion." :
    status === "blocked" || status === "failed" || status === "cancelled"
      || status === "completed" ? null :
    status === "checkpointed" ? cp?.nextAction ?? nextTask :
    nextTask;

  return {
    ...base,
    objective: {
      id: objectiveId,
      goal: text(objective.goal)!,
      status,
      updatedAt: date(objective.updated_at),
    },
    nextAction,
    blocker,
    checkpoint: cp,
    lastEvent: event ? {
      id: id(event.id)!,
      kind: text(event.event_type)!,
      createdAt: date(event.created_at)!,
    } : null,
    taskCounts: counts,
    completionEvidenceRecorded:
      status === "completed" && recordedEvidence(objective.completion_evidence),
  };
}
