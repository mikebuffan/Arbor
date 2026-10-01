import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import { beginSelfUpdate } from "../../agency/updateLifecycle";
import type { ArborRuntimeState } from "../runtimeState";
import {
  loadRuntimeState,
  loadLatestRuntimeState,
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
      neq() { return this; },
      order() { return this; },
      async limit() { return { data: [], error: null }; },
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

  it("falls back past a blank current thread to the latest meaningful project runtime", async () => {
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
    const query = {
      select() { return this; },
      eq() { return this; },
      neq() { return this; },
      order() { return this; },
      async limit() {
        return { data: [{ user_id: "user-1", project_id: "project-1",
          conversation_id: meaningfulState.conversationId, state: meaningfulState,
          updated_at: meaningfulState.updatedAt }], error: null };
      },
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
      from: vi.fn(() => query),
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
  });

});

function fixture(conversationId: string, updatedAt: string): ArborRuntimeState {
  return { schemaVersion: 1, userId: "owner", projectId: "project", conversationId,
    channel: "text", activeSubsystem: "arbor", currentGoal: "local goal",
    lastMeaningfulUserTurn: "local user turn", lastMeaningfulArborTurn: "local response",
    agency: null, corrections: [], behaviorProof: null, pendingSelfUpdate: null,
    createdAt: "2026-10-01T00:00:00Z", updatedAt };
}

function correction(value: string, observedAt: string, occurrences = 1) {
  return { id: "behavior:identity-drift", kind: "behavior" as const, value,
    source: "text" as const, observedAt, confidence: 1, protected: true, occurrences };
}

function database(states: ArborRuntimeState[]) {
  const queriedScopes: Array<Record<string, string>> = [];
  const supabase = { from: vi.fn((table: string) => {
    expect(table).toBe("arbor_conversation_state");
    const filters: Record<string, string> = {};
    let excluded = "";
    const rows = () => states.filter(s => s.userId === filters.user_id && s.projectId === filters.project_id &&
      (!filters.conversation_id || s.conversationId === filters.conversation_id) && s.conversationId !== excluded)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(s => ({ user_id: s.userId,
        project_id: s.projectId, conversation_id: s.conversationId, updated_at: s.updatedAt, state: s }));
    return {
      select() { return this; },
      eq(key: string, value: string) { filters[key] = value; return this; },
      neq(_key: string, value: string) { excluded = value; return this; },
      order() { return this; },
      async maybeSingle() { queriedScopes.push({ ...filters }); return { data: rows()[0] ?? null, error: null }; },
      async limit(count: number) { queriedScopes.push({ ...filters }); return { data: rows().slice(0, count), error: null }; },
    };
  }) } as unknown as SupabaseClient;
  return { supabase, queriedScopes };
}

describe("cross-thread correction recall", () => {
  it("restores newer corrections from another surface without replacing an active thread's goal", async () => {
    const old = fixture("old", "2026-10-01T00:10:00Z");
    old.corrections = [correction("Earlier calibration", "2026-10-01T00:05:00Z")];
    const newer = fixture("new", "2026-10-01T00:20:00Z");
    newer.channel = "voice";
    newer.currentGoal = "other thread goal";
    newer.corrections = [correction("Updated calibration", "2026-10-01T00:15:00Z", 2)];
    const foreign = fixture("foreign", "2026-10-01T00:30:00Z");
    foreign.userId = "other-owner";
    foreign.corrections = [correction("Private foreign correction", "2026-10-01T00:25:00Z", 99)];
    const db = database([old, newer, foreign]);
    const input = { supabase: db.supabase, userId: "owner", projectId: "project", conversationId: "old" };
    const loaded = await loadRuntimeState(input);
    expect(loaded).toMatchObject({ conversationId: "old", channel: "text", currentGoal: "local goal",
      lastMeaningfulUserTurn: "local user turn", corrections: [expect.objectContaining({
        value: "Updated calibration", occurrences: 2 })] });
    const replayed = await loadRuntimeState(input);
    expect(replayed?.corrections).toEqual(loaded?.corrections);
    expect(db.queriedScopes.every(scope => scope.user_id === "owner" && scope.project_id === "project")).toBe(true);
  });

  it("finds meaningful context behind multiple fresh empty threads and merges independent correction families", async () => {
    const meaningful = fixture("active", "2026-10-01T00:10:00Z");
    meaningful.corrections = [correction("Preserve humor", "2026-10-01T00:05:00Z", 3)];
    const blank = fixture("blank", "2026-10-01T00:30:00Z");
    blank.currentGoal = blank.lastMeaningfulUserTurn = blank.lastMeaningfulArborTurn = null;
    const secondBlank = { ...blank, conversationId: "second-blank", updatedAt: "2026-10-01T00:20:00Z" };
    const db = database([meaningful, blank, secondBlank]);
    expect(await loadLatestRuntimeState({ supabase: db.supabase, userId: "owner", projectId: "project" }))
      .toMatchObject({ conversationId: "active", currentGoal: "local goal" });
    expect(await loadRuntimeState({ supabase: db.supabase, userId: "owner", projectId: "project", conversationId: "blank" }))
      .toMatchObject({ conversationId: "blank", currentGoal: "local goal", corrections: [expect.objectContaining({ occurrences: 3 })] });
  });

  it("rejects a persisted state whose inner owner/project does not match its row", async () => {
    const state = fixture("thread", "2026-10-01T00:10:00Z");
    state.userId = "wrong-owner";
    const query = { select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: { user_id: "owner", project_id: "project",
        conversation_id: "thread", updated_at: state.updatedAt, state }, error: null }; } };
    const supabase = { from: () => query } as unknown as SupabaseClient;
    await expect(loadRuntimeState({ supabase, userId: "owner", projectId: "project", conversationId: "thread" }))
      .rejects.toThrow("persisted_scope_mismatch");
  });
});
