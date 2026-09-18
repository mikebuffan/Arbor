export const ARK_SCHEMA_VERSION = 1 as const;

export type ArkObjectiveStatus =
  | "queued"
  | "running"
  | "checkpointed"
  | "blocked"
  | "awaiting_verification"
  | "completed"
  | "failed"
  | "cancelled";

export type ArkTaskStatus =
  | "queued"
  | "running"
  | "checkpointed"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type ArkBudget = {
  maxTasksPerCycle: number;
  maxRuntimeMs: number;
  maxAttemptsPerTask: number;
};

export type ArkObjective = {
  id: string;
  userId: string;
  projectId: string;
  goal: string;
  status: ArkObjectiveStatus;
  priority: number;
  budget: ArkBudget;
  blocker: Record<string, unknown> | null;
  completionEvidence: unknown | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ArkTask = {
  id: string;
  objectiveId: string;
  userId: string;
  projectId: string;
  taskKey: string;
  kind: string;
  description: string;
  status: ArkTaskStatus;
  dependencies: string[];
  payload: Record<string, unknown>;
  result: unknown | null;
  attemptCount: number;
  maxAttempts: number;
  idempotencyKey: string;
  availableAt: string;
  leaseOwner: string | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  checkpointSequence: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ArkClaim = {
  objective: ArkObjective;
  task: ArkTask;
};

export type ArkTaskDraft = {
  taskKey: string;
  kind: string;
  description: string;
  dependencies?: string[];
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  idempotencyKey: string;
};

export type ArkObjectiveDraft = {
  userId: string;
  projectId: string;
  goal: string;
  priority?: number;
  budget?: Partial<ArkBudget>;
  idempotencyKey: string;
  tasks: ArkTaskDraft[];
};

export type ArkCheckpoint = {
  sequence: number;
  state: Record<string, unknown>;
  nextAction: string;
  reason: "budget" | "interruption" | "dependency" | "executor";
  resumeAfter?: string;
};

export type ArkExecutionResult =
  | { status: "completed"; result?: unknown }
  | { status: "checkpointed"; checkpoint: ArkCheckpoint }
  | {
      status: "blocked";
      blocker: {
        kind:
          | "external_authority"
          | "irreversible_action"
          | "missing_preference"
          | "high_consequence_fork"
          | "unsupported_capability";
        message: string;
      };
    };

export type ArkVerification = {
  ok: boolean;
  evidence?: unknown;
  unresolvedWork?: string[];
};

export const DEFAULT_ARK_BUDGET: ArkBudget = {
  maxTasksPerCycle: 8,
  maxRuntimeMs: 25_000,
  maxAttemptsPerTask: 3,
};
