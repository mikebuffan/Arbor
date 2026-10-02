import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { beginRuntimeSession } from "../runtimeSession";
import { projectRuntimeStartup } from "../hostProjection";
import { projectRuntimeMemory } from "../../continuity/runtimeMemoryProjection";

// Each connection/session is fresh; only serialized rows survive.
function durableStore() {
  const rows = new Map<string, any>();
  const connect = () => ({ from() {
    const filters: Record<string, string> = {};
    let excluded: string | undefined;
    const matches = () => [...rows.values()].filter(row =>
      Object.entries(filters).every(([key, value]) => row[key] === value) && row.conversation_id !== excluded,
    ).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return {
      select() { return this; },
      eq(key: string, value: string) { filters[key] = value; return this; },
      neq(_key: string, value: string) { excluded = value; return this; },
      order() { return this; },
      async limit(count: number) { return { data: matches().slice(0, count), error: null }; },
      async maybeSingle() { return { data: matches()[0] ?? null, error: null }; },
      async upsert(row: any) {
        rows.set(`${row.user_id}:${row.project_id}:${row.conversation_id}`, JSON.parse(JSON.stringify(row)));
        return { error: null };
      },
    };
  } }) as unknown as SupabaseClient;
  return { connect };
}
const base = { userId: "owner", projectId: "private", channel: "text" as const, activeSubsystem: "arbor" as const };

describe("durable memory through independent session startup", () => {
  it("projects a Voice correction into an older Text thread without losing unfinished work or multiplying feedback", async () => {
    const db = durableStore();
    await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "text",
      currentGoal: "finish memory", now: "2026-10-02T18:00:00Z", lastMeaningfulUserTurn: "Keep going",
      agency: { goal: "finish memory", status: "active", currentStep: 2,
        unresolvedWork: ["verify restart"], recurringWeaknesses: [], strategyNotes: [] },
    });
    await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "voice", channel: "voice",
      currentGoal: "separate voice task", now: "2026-10-02T18:01:00Z",
      corrections: [{ id: "behavior:identity", kind: "behavior", value: "Preserve humor without mirroring my energy",
        source: "voice", observedAt: "2026-10-02T18:01:00Z", confidence: 1, protected: true, occurrences: 1 }],
    });
    const restart = () => beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "text", now: "2026-10-02T18:02:00Z" });
    const state = await restart();
    expect(state.currentGoal).toBe("finish memory");
    expect(projectRuntimeMemory(state).unresolvedWork).toEqual(["verify restart"]);
    expect(projectRuntimeStartup(state).behaviorCorrections).toContain("Preserve humor without mirroring my energy");
    expect(projectRuntimeStartup(state).startup.promptBlock).toContain("Preserve humor without mirroring my energy");
    const again = await restart();
    expect(again.corrections[0].occurrences).toBe(1);
    expect(again.channel).toBe("text");
  });

  it("keeps a completed cleared task cleared across restart into a new conversation", async () => {
    const db = durableStore();
    await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "done", currentGoal: "completed task", now: "2026-10-02T18:00:00Z" });
    await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "done",
      currentGoal: null, lastMeaningfulArborTurn: "Verified complete", now: "2026-10-02T18:01:00Z",
      agency: { goal: "completed task", status: "complete", currentStep: 3, unresolvedWork: [], recurringWeaknesses: [], strategyNotes: [] },
    });
    const fresh = await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "fresh", now: "2026-10-02T18:02:00Z" });
    expect(fresh.currentGoal).toBeNull();
    expect(fresh.agency?.status).toBe("complete");
    expect(projectRuntimeMemory(fresh).unresolvedWork).toEqual([]);
  });

  it("excludes another owner or project's private correction from a new thread", async () => {
    const db = durableStore();
    await beginRuntimeSession({ ...base, supabase: db.connect(), conversationId: "secret", currentGoal: "private work", now: "2026-10-02T18:00:00Z",
      corrections: [{ id: "private", kind: "preference", value: "secret calibration", source: "text", observedAt: "2026-10-02T18:00:00Z", confidence: 1, protected: true }],
    });
    for (const changed of [{ userId: "foreign" }, { projectId: "foreign" }]) {
      const loaded = await beginRuntimeSession({ ...base, ...changed, supabase: db.connect(), conversationId: "fresh", now: "2026-10-02T18:01:00Z" });
      expect(loaded.corrections).toEqual([]);
      expect(loaded.currentGoal).toBeNull();
    }
  });
});
