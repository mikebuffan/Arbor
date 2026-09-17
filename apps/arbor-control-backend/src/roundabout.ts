import {
  allocateAttention,
  type AttentionState,
  type BridgeSignal,
} from "./cognitiveDynamics.js";

export interface RoundaboutRoute {
  attention: AttentionState;
  forwardIds: string[];
  reprocessIds: string[];
  unresolvedIds: string[];
  preservedSignals: BridgeSignal[];
}

export function routeRoundabout(
  signals: BridgeSignal[],
  capacity = 4,
  now = Date.now(),
): RoundaboutRoute {
  const live = signals.filter((signal) =>
    !signal.validUntil || now < Date.parse(signal.validUntil)
  );

  const byContent = new Map<string, BridgeSignal[]>();
  for (const signal of live) {
    const key = signal.content.trim().toLowerCase();
    const group = byContent.get(key) ?? [];
    group.push(signal);
    byContent.set(key, group);
  }

  const conflictIds = new Set(
    live
      .filter((signal) => signal.kind === "conflict" || signal.unresolved)
      .map((signal) => signal.id),
  );

  const attention = allocateAttention(live, capacity, now);
  const reprocessIds = attention.focusIds.filter((id) => conflictIds.has(id));
  const forwardIds = attention.focusIds.filter((id) => !conflictIds.has(id));

  return {
    attention,
    forwardIds,
    reprocessIds,
    unresolvedIds: [...new Set([
      ...attention.unresolvedIds,
      ...reprocessIds,
    ])],
    preservedSignals: structuredClone(live),
  };
}

export function bridgeRoundTrip(signal: BridgeSignal): BridgeSignal {
  // Boundary crossing must preserve meaning-bearing metadata exactly.
  return structuredClone(signal);
}
