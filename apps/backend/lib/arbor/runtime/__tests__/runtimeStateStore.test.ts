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
      from: vi.fn(() => query),
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
  });
});
