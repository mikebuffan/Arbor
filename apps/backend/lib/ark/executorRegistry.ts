import type {
  ArkClaim,
  ArkExecutionResult,
} from "./types";

export type ArkExecutionContext = {
  claim: ArkClaim;
  heartbeat(): Promise<void>;
};

export type ArkExecutor = (
  context: ArkExecutionContext,
) => Promise<ArkExecutionResult>;

export class ArkExecutorRegistry {
  private readonly executors = new Map<string, ArkExecutor>();

  register(kind: string, executor: ArkExecutor): this {
    if (this.executors.has(kind)) {
      throw new Error(`ark_duplicate_executor:${kind}`);
    }
    this.executors.set(kind, executor);
    return this;
  }

  get(kind: string): ArkExecutor | null {
    return this.executors.get(kind) ?? null;
  }
}
