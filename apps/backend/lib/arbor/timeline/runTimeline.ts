import type { ArborTimelineCursor } from "./types";
import type {
  AppendTimelineEventInput,
  ArborTimelineStore,
} from "./store";

export type TimelineContext = {
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
  subsystem: "arbor" | "annabelle";
  channel: "text" | "voice";
};

export class ArborTimeline {
  private cursor: ArborTimelineCursor;

  private constructor(
    private readonly store: ArborTimelineStore,
    private readonly context: TimelineContext,
    cursor: ArborTimelineCursor,
  ) {
    this.cursor = cursor;
  }

  static async create(
    store: ArborTimelineStore,
    context: TimelineContext,
  ): Promise<ArborTimeline> {
    const cursor = await store.open(context.turnId);
    return new ArborTimeline(store, context, cursor);
  }

  async record(
    phase: AppendTimelineEventInput["phase"],
    type: AppendTimelineEventInput["type"],
    payload: Record<string, unknown> = {},
    actionId?: string,
  ): Promise<void> {
    const result = await this.store.append(this.cursor, {
      ...this.context,
      phase,
      type,
      payload,
      actionId,
    });

    this.cursor = result.cursor;
  }
}
