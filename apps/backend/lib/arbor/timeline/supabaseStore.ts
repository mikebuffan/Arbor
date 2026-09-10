import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborTimelineCursor, ArborTimelineEvent } from "./types";
import type { AppendTimelineEventInput, ArborTimelineStore } from "./store";

export class SupabaseTimelineStore implements ArborTimelineStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async open(turnId: string): Promise<ArborTimelineCursor> {
    const { data, error } = await this.supabase
      .from("arbor_timeline_events")
      .select("sequence")
      .eq("turn_id", turnId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return {
      turnId,
      nextSequence: typeof data?.sequence === "number" ? data.sequence + 1 : 0,
    };
  }

  async append(
    cursor: ArborTimelineCursor,
    input: AppendTimelineEventInput,
  ): Promise<{ cursor: ArborTimelineCursor; event: ArborTimelineEvent }> {
    if (cursor.turnId !== input.turnId) {
      throw new Error("timeline_cursor_turn_mismatch");
    }

    const event: ArborTimelineEvent = {
      id: crypto.randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      conversationId: input.conversationId ?? null,
      turnId: input.turnId,
      sequence: cursor.nextSequence,
      phase: input.phase,
      type: input.type,
      subsystem: input.subsystem,
      channel: input.channel,
      actionId: input.actionId ?? null,
      payload: input.payload ?? {},
      createdAt: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from("arbor_timeline_events")
      .insert({
        id: event.id,
        user_id: event.userId,
        project_id: event.projectId,
        conversation_id: event.conversationId,
        turn_id: event.turnId,
        sequence: event.sequence,
        phase: event.phase,
        event_type: event.type,
        subsystem: event.subsystem,
        channel: event.channel,
        action_id: event.actionId,
        payload: event.payload,
        created_at: event.createdAt,
      });

    if (error) throw error;

    return {
      event,
      cursor: { turnId: cursor.turnId, nextSequence: cursor.nextSequence + 1 },
    };
  }

  async list(turnId: string): Promise<ArborTimelineEvent[]> {
    const { data, error } = await this.supabase
      .from("arbor_timeline_events")
      .select("*")
      .eq("turn_id", turnId)
      .order("sequence", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  async latest(turnId: string): Promise<ArborTimelineEvent | null> {
    const { data, error } = await this.supabase
      .from("arbor_timeline_events")
      .select("*")
      .eq("turn_id", turnId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data) : null;
  }
}

function mapRow(row: Record<string, unknown>): ArborTimelineEvent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    conversationId: row.conversation_id == null ? null : String(row.conversation_id),
    turnId: String(row.turn_id),
    sequence: Number(row.sequence),
    phase: row.phase as ArborTimelineEvent["phase"],
    type: row.event_type as ArborTimelineEvent["type"],
    subsystem: row.subsystem as ArborTimelineEvent["subsystem"],
    channel: row.channel as ArborTimelineEvent["channel"],
    actionId: row.action_id == null ? null : String(row.action_id),
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}
