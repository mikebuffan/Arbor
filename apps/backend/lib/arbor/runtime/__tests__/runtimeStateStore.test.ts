import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import { beginSelfUpdate } from "../../agency/updateLifecycle";
import type { ArborRuntimeState } from "../runtimeState";
import {
  loadRuntimeState,
  saveRuntimeState,
} from "../runtimeStateStore";

describe("runtime state persistence", () => {
  it("round-trips a pending self-update without losing verification state", async () => {
    const behavior = buildArborBehaviorProjection({
      mode: "text",
    }).proof;

    const pendingSelfUpdate = beginSelfUpdate({
      id: "pending-1",
      strategy: "verify before claiming complete",
      baselineScore: 0.4,
      behavior,
      protectedCorrections: ["keep agency"],
      now: "2026-09-10T20:00:00.000Z",
    });

    const state: ArborRuntimeState = {
      schemaVersion: 1,
      userId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      channel: "text",
      activeSubsystem: "arbor",
      currentGoal: "finish integration",
      lastMeaningfulUserTurn: "keep going",
      lastMeaningfulArborTurn: "still working",
      agency: null,
      corrections: [],
      behaviorProof: behavior,
      pendingSelfUpdate,
      createdAt: "2026-09-10T20:00:00.000Z",
      updatedAt: "2026-09-10T20:01:00.000Z",
    };

    let storedRow: Record<string, unknown> | null = null;
    const queriedTables: string[] = [];

    const query = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      async maybeSingle() {
        return {
          data: storedRow,
          error: null,
        };
      },
      async upsert(payload: Record<string, unknown>) {
        storedRow = payload;
        return { error: null };
      },
    };

    const supabase = {
      from: vi.fn((table: string) => {
        queriedTables.push(table);
        return query;
      }),
    } as unknown as SupabaseClient;

    await saveRuntimeState({ supabase, state });

    const loaded = await loadRuntimeState({
      supabase,
      userId: state.userId,
      projectId: state.projectId,
      conversationId: state.conversationId,
    });

    expect(loaded?.pendingSelfUpdate).toEqual(
      pendingSelfUpdate,
    );
    expect(loaded?.currentGoal).toBe(
      "finish integration",
    );
    expect(queriedTables.filter((table) => table === "arbor_conversation_state")).toHaveLength(2);
    expect(queriedTables.filter((table) => table === "arbor_runtime_state")).toHaveLength(1);
  });

  it("prefers the durable project carrier when the current thread is blank", async () => {
    const blankState: ArborRuntimeState = {
      schemaVersion: 1,
      userId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-blank",
      channel: "text",
      activeSubsystem: "arbor",
      currentGoal: null,
      lastMeaningfulUserTurn: null,
      lastMeaningfulArborTurn: null,
      agency: null,
      corrections: [],
      behaviorProof: null,
      pendingSelfUpdate: null,
      createdAt: "2026-09-14T20:00:00.000Z",
      updatedAt: "2026-09-14T20:10:00.000Z",
    };

    const meaningfulState: ArborRuntimeState = {
      ...blankState,
      conversationId: "conversation-meaningful",
      currentGoal: "restore automatic memory path",
      lastMeaningfulUserTurn: "keep going",
      lastMeaningfulArborTurn: "still working",
      updatedAt: "2026-09-14T20:09:00.000Z",
    };

    let lookup = 0;
    const queriedTables: string[] = [];
    const query = {
      select() { return this; },
      eq() { return this; },
      neq() { return this; },
      order() { return this; },
      limit() { return this; },
      async maybeSingle() {
        lookup += 1;
        return {
          data:
            lookup === 1
              ? {
                  user_id: "user-1",
                  project_id: "project-1",
                  conversation_id: "conversation-blank",
                  state: blankState,
                  updated_at: blankState.updatedAt,
                }
              : {
                  user_id: "user-1",
                  project_id: "project-1",
                  conversation_id: "conversation-meaningful",
                  state: meaningfulState,
                  updated_at: meaningfulState.updatedAt,
                },
          error: null,
        };
      },
    };

    const supabase = {
      from: vi.fn((table: string) => {
        queriedTables.push(table);
        return query;
      }),
    } as unknown as SupabaseClient;

    const loaded = await loadRuntimeState({
      supabase,
      userId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-blank",
    });

    expect(loaded?.conversationId).toBe("conversation-blank");
    expect(loaded?.currentGoal).toBe("restore automatic memory path");
    expect(loaded?.lastMeaningfulUserTurn).toBe("keep going");
    expect(queriedTables).toContain("arbor_conversation_state");
    expect(queriedTables).toContain("arbor_runtime_state");
  });

});
