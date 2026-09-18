import type {
  ArkCheckpoint,
  ArkClaim,
  ArkObjective,
  ArkObjectiveDraft,
  ArkTask,
  ArkVerification,
} from "./types";

export type ArkTaskCompletion = {
  objective: ArkObjective;
  task: ArkTask;
};

export interface ArkStore {
  enqueueObjective(draft: ArkObjectiveDraft): Promise<ArkObjective>;
  claimNextTask(input: {
    workerId: string;
    leaseMs: number;
    now: string;
    excludedObjectiveIds?: string[];
  }): Promise<ArkClaim | null>;
  nextObjectiveAwaitingVerification(): Promise<ArkObjective | null>;
  heartbeat(input: {
    taskId: string;
    workerId: string;
    leaseToken: string;
    leaseMs: number;
    now: string;
  }): Promise<boolean>;
  checkpoint(input: {
    claim: ArkClaim;
    checkpoint: ArkCheckpoint;
    now: string;
  }): Promise<ArkTask>;
  completeTask(input: {
    claim: ArkClaim;
    result: unknown;
    now: string;
  }): Promise<ArkTaskCompletion>;
  blockTask(input: {
    claim: ArkClaim;
    blocker: Record<string, unknown>;
    now: string;
  }): Promise<ArkTaskCompletion>;
  failTask(input: {
    claim: ArkClaim;
    error: string;
    retryAt: string | null;
    now: string;
  }): Promise<ArkTaskCompletion>;
  verifyObjective(input: {
    objectiveId: string;
    verification: ArkVerification;
    now: string;
  }): Promise<ArkObjective>;
}
