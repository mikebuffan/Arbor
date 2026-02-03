export type TelemetryPayload = {
  traceId: string; // uuid
  userId: string;
  projectId?: string;
  threadId?: string;
  episodeId?: string | null;

  injectedAnchorIds?: string[];
  injectedMemoryItemIds?: string[];

  safetyTier?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  logicGatesHit?: string[];

  retrievalLatencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
};
