import type {
  ArborState,
} from "./types.js";

export type CapabilityRisk =
  | "read"
  | "reversible_write"
  | "irreversible"
  | "high_consequence";

export type CapabilityContext = {
  projectId?: string;
  conversationId?: string;
  turnId: string;
  state: ArborState;
};

export type CapabilityExecution = {
  result: unknown;
  statePatch?: Partial<ArborState>;
};

export type ArborCapability = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: CapabilityRisk;
  execute(
    args: Record<string, unknown>,
    context: CapabilityContext,
  ): Promise<CapabilityExecution>;
};

export class ArborCapabilityRegistry {
  private readonly values =
    new Map<string, ArborCapability>();

  register(
    capability: ArborCapability,
  ): this {
    if (
      this.values.has(
        capability.name,
      )
    ) {
      throw new Error(
        `duplicate_capability:${capability.name}`,
      );
    }

    this.values.set(
      capability.name,
      capability,
    );

    return this;
  }

  get(
    name: string,
  ): ArborCapability {
    const capability =
      this.values.get(
        name,
      );

    if (!capability) {
      throw new Error(
        `unknown_capability:${name}`,
      );
    }

    return capability;
  }

  list(): ArborCapability[] {
    return [
      ...this.values.values(),
    ];
  }

  openAITools(): Array<Record<string, unknown>> {
    return this.list().map(
      (capability) => ({
        type: "function",
        name: capability.name,
        description: capability.description,
        parameters: capability.parameters,
        strict: true,
      }),
    );
  }
}

export function requiresUserBoundary(
  capability: ArborCapability,
): boolean {
  return (
    capability.risk === "irreversible" ||
    capability.risk === "high_consequence"
  );
}
