import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborRuntimeState } from "../runtimeState";
import { createCorrection } from "../corrections";

const persistence = vi.hoisted(() => ({
  loadRuntimeState: vi.fn(),
  saveRuntimeState: vi.fn(),
}));
vi.mock("../runtimeStateStore", () => persistence);

import { beginRuntimeSession, updateRuntimeSession } from "../runtimeSession";

const supabase = {} as SupabaseClient;
const initialAt = "2026-10-10T10:00:00.000Z";
const inputs = {
  supabase,
  userId:"fixture-owner",
  projectId:"fixture-project",
  conversationId:"fixture-conversation",
  channel:"text" as const,
  activeSubsystem:"arbor" as const,
};
const record = (observationId:string, time=initialAt) => createCorrection({
  value:"Why did you stop? Keep going.",
  source:"text",observedAt:time,observationId,
});

describe("B11/C08 host-identified correction session recovery (synthetic store)", () => {
  let stored: ArborRuntimeState | null;
  let failNextSave: boolean;

  beforeEach(()=>{
    stored = null;
    failNextSave = false;
    persistence.loadRuntimeState.mockReset().mockImplementation(async ()=>
      stored ? structuredClone(stored) : null);
    persistence.saveRuntimeState.mockReset().mockImplementation(async ({
      state,
    }: {state:ArborRuntimeState})=>{
      if(failNextSave){failNextSave=false;throw Error("fixture_write_failed");}
      stored=structuredClone(state);
    });
  });

  it("retains two distinct user message IDs through failed-save retry and reopen", async()=>{
    const first=record("message:owner:001");
    const second=record("message:owner:002");
    const created=await beginRuntimeSession({
      ...inputs, corrections:[first], now:initialAt,
    });
    expect(created.corrections[0].occurrences).toBe(1);
    expect(stored?.corrections[0].observationIds).toEqual(["message:owner:001"]);

    failNextSave=true;
    await expect(updateRuntimeSession({
      supabase,state:created,corrections:[second],
      now:"2026-10-10T10:01:00.000Z",
    })).rejects.toThrow("fixture_write_failed");

    // Failed writes must not be counted as durable feedback.
    expect(stored?.corrections[0].occurrences).toBe(1);
    const recovered=await beginRuntimeSession({
      ...inputs, corrections:[second],
      now:"2026-10-10T10:02:00.000Z",
    });
    expect(recovered.corrections[0].occurrences).toBe(2);
    expect(recovered.corrections[0].observationIds).toEqual([
      "message:owner:001","message:owner:002",
    ]);
    expect(stored?.corrections[0].occurrences).toBe(2);

    // The request is retried again after a lost response, but its message ID
    // must not create another correction or drift the aggregate count.
    const replay=await updateRuntimeSession({
      supabase,state:recovered,
      corrections:[record("message:owner:002","2026-10-10T10:03:00.000Z")],
      now:"2026-10-10T10:03:00.000Z",
    });
    expect(replay.corrections[0].occurrences).toBe(2);

    const reopened=await beginRuntimeSession({
      ...inputs,channel:"voice",
      now:"2026-10-10T10:04:00.000Z",
    });
    expect(reopened.corrections[0].occurrences).toBe(2);
    expect(reopened.corrections[0].observationIds).toEqual([
      "message:owner:001","message:owner:002",
    ]);
    expect(reopened.channel).toBe("voice");
  });

  it("keeps historical unattributed correction counts without creating fake IDs",async()=>{
    const legacy=record("message:owner:legacy");
    delete legacy.observationIds;
    delete legacy.legacyOccurrences;
    legacy.occurrences=2;
    const saved=await beginRuntimeSession({
      ...inputs, corrections:[legacy],now:initialAt,
    });
    expect(saved.corrections[0].observationIds).toBeUndefined();
    const repeated=await beginRuntimeSession({
      ...inputs,corrections:[],now:"2026-10-10T10:02:00.000Z",
    });
    expect(repeated.corrections[0].occurrences).toBe(2);
    expect(repeated.corrections[0].observationIds).toBeUndefined();
  });
});
