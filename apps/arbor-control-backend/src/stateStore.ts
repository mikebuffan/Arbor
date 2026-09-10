import type { ArborState } from "./types.js";

export interface ArborStateStore {
  load(scope: string): Promise<ArborState | null>;
  save(scope: string, state: ArborState): Promise<void>;
}

export class InMemoryArborStateStore implements ArborStateStore {
  private readonly values = new Map<string, ArborState>();

  async load(scope: string): Promise<ArborState | null> {
    return this.values.get(scope) ?? null;
  }

  async save(scope: string, state: ArborState): Promise<void> {
    this.values.set(scope, structuredClone(state));
  }
}

export function stateScope(input: {
  projectId?: string;
  conversationId?: string;
}): string {
  return input.projectId?.trim()
    ? `project:${input.projectId.trim()}`
    : input.conversationId?.trim()
      ? `conversation:${input.conversationId.trim()}`
      : "default";
}
