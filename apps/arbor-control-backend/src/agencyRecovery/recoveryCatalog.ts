import type { ArborBlocker } from "./types.js";
import type {
  ArborAgencyRoute,
  ArborRecoveryDiscoveryContext,
  ArborRecoveryRouteProvider,
} from "./executor.js";

export interface ArborRecoveryCapability<T> {
  id: string;
  description: string;
  confidence: number;
  capabilities: string[];
  requiresUserInput: boolean;
  requiredUserInput?: string;
  preservesGoal: boolean;
  supports(input: {
    goal: string;
    blocker: ArborBlocker;
    attemptedOptionIds: string[];
    failedRouteId?: string;
  }): boolean;
  execute(): Promise<T>;
}

export class ArborRecoveryCapabilityCatalog<T>
  implements ArborRecoveryRouteProvider<T> {
  private readonly capabilities =
    new Map<string, ArborRecoveryCapability<T>>();

  register(capability: ArborRecoveryCapability<T>): void {
    if (this.capabilities.has(capability.id)) {
      throw new Error(
        `ARBOR_RECOVERY_CAPABILITY_ID_COLLISION:${capability.id}`,
      );
    }

    this.capabilities.set(capability.id, capability);
  }

  unregister(id: string): boolean {
    return this.capabilities.delete(id);
  }

  list(): ArborRecoveryCapability<T>[] {
    return [...this.capabilities.values()];
  }

  async discover(
    context: ArborRecoveryDiscoveryContext,
  ): Promise<ArborAgencyRoute<T>[]> {
    return this.list()
      .filter(
        (capability) =>
          !context.attemptedOptionIds.includes(capability.id),
      )
      .filter((capability) =>
        capability.supports({
          goal: context.goal,
          blocker: context.latestBlocker,
          attemptedOptionIds: [...context.attemptedOptionIds],
          failedRouteId: context.failedRouteId,
        }),
      )
      .map((capability) => ({
        id: capability.id,
        description: capability.description,
        confidence: capability.confidence,
        requiresUserInput: capability.requiresUserInput,
        requiredUserInput: capability.requiredUserInput,
        preservesGoal: capability.preservesGoal,
        applicable: (blocker) =>
          capability.supports({
            goal: context.goal,
            blocker,
            attemptedOptionIds: [...context.attemptedOptionIds],
            failedRouteId: context.failedRouteId,
          }),
        execute: capability.execute,
      }));
  }
}
