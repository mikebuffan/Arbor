export type ArborTimelinePhase =
  | "input"
  | "retrieve"
  | "decide"
  | "act"
  | "observe"
  | "verify"
  | "update"
  | "generate"
  | "render"
  | "persist"
  | "complete"
  | "blocked"
  | "error";

export type ArborTimelineEventType =
  | "turn_started"
  | "state_loaded"
  | "goal_resolved"
  | "action_selected"
  | "action_started"
  | "action_completed"
  | "action_failed"
  | "verification_passed"
  | "verification_failed"
  | "strategy_updated"
  | "canonical_response_generated"
  | "adapter_selected"
  | "render_completed"
  | "state_persisted"
  | "turn_completed"
  | "turn_blocked";

export type ArborTimelineEvent = {
  id: string;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
  sequence: number;
  phase: ArborTimelinePhase;
  type: ArborTimelineEventType;
  subsystem: "arbor" | "annabelle";
  channel: "text" | "voice";
  actionId?: string | null;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type ArborTimelineCursor = {
  turnId: string;
  nextSequence: number;
};
