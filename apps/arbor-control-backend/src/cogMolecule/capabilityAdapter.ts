import {
  requiresUserBoundary,
  type ArborCapabilityRegistry,
  type CapabilityContext,
  type CapabilityExecution,
} from "../capabilities.js";
import type { CogEvidence } from "./types.js";

export function capabilityRegistryEvidence(
  registry: ArborCapabilityRegistry,
): CogEvidence[] {
  return registry.list().map((capability) => ({
    id: `capability:${capability.name}`,
    value: {
      name: capability.name,
      description: capability.description,
      parameters: capability.parameters,
      risk: capability.risk,
    },
    provenance: ["arbor:capability-registry"],
    confidence: 1,
  }));
}

export async function executeMoleculeCapability(
  registry: ArborCapabilityRegistry,
  name: string,
  args: Record<string, unknown>,
  context: CapabilityContext,
  userBoundaryAuthorized = false,
): Promise<CapabilityExecution> {
  const capability = registry.get(name);

  if (requiresUserBoundary(capability) && !userBoundaryAuthorized) {
    throw new Error(`molecule_user_boundary_required:${name}:${capability.risk}`);
  }

  return capability.execute(args, context);
}
