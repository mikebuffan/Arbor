import type { ArborBackendBridge } from "../backendBridge.js";
import { stateScope, type ArborStateStore } from "../stateStore.js";
import type { CogEvidence } from "./types.js";

export type MoleculeRetrievalInput = {
  projectId?: string;
  conversationId?: string;
  authorization?: string;
  historyTurns?: number;
};

export type MoleculeRetrievalResult = {
  evidence: CogEvidence[];
  provenance: string[];
  localMessages: number;
  externalItems: number;
};

export async function retrieveMoleculeEvidence(
  store: ArborStateStore,
  bridge: ArborBackendBridge,
  input: MoleculeRetrievalInput,
): Promise<MoleculeRetrievalResult> {
  const scope = stateScope(input);
  const [history, external] = await Promise.all([
    store.recentMessages(scope, input.historyTurns ?? 12),
    bridge.loadState({
      projectId: input.projectId,
      conversationId: input.conversationId,
      authorization: input.authorization,
    }).catch(() => ({})),
  ]);

  const evidence: CogEvidence[] = history.map((message, index) => ({
    id: `history:${scope}:${index}`,
    value: { role: message.role, content: message.content },
    provenance: [`arbor:state-store:${scope}`, `history:${index}`],
    confidence: 1,
  }));

  const rawMemory = Array.isArray(external.memory) ? external.memory : [];
  for (let index = 0; index < rawMemory.length; index += 1) {
    const item = rawMemory[index];
    if (!item || typeof item !== "object") continue;
    const memory = item as Record<string, unknown>;
    const key = typeof memory.key === "string" && memory.key.trim()
      ? memory.key.trim()
      : `item-${index}`;
    const confidence = typeof memory.confidence === "number"
      ? clamp01(memory.confidence)
      : 0.5;

    evidence.push({
      id: `memory:${key}`,
      value: memory,
      provenance: [`arbor:backend-memory:${key}`],
      confidence,
    });
  }

  return {
    evidence,
    provenance: unique(evidence.flatMap((item) => item.provenance)),
    localMessages: history.length,
    externalItems: rawMemory.length,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
