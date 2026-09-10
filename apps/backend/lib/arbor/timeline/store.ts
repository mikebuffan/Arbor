import type {
  ArborTimelineCursor,
  ArborTimelineEvent,
  ArborTimelineEventType,
  ArborTimelinePhase,
} from "./types";

export type AppendTimelineEventInput = {
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
  phase: ArborTimelinePhase;
  type: ArborTimelineEventType;
  subsystem: "arbor" | "annabelle";
  channel: "text" | "voice";
  actionId?: string | null;
  payload?: Record<string, unknown>;
};

export interface ArborTimelineStore {
  open(turnId: string): Promise<ArborTimelineCursor>;

  append(
    cursor: ArborTimelineCursor,
    event: AppendTimelineEventInput,
  ): Promise<{
    cursor: ArborTimelineCursor;
    event: ArborTimelineEvent;
  }>;

  list(turnId: string): Promise<ArborTimelineEvent[]>;
  latest(turnId: string): Promise<ArborTimelineEvent | null>;
}
