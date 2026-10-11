import { describe, expect, it, vi } from "vitest";
import type { AgencyState } from "../engine";
import {
  beginAgencySession,
  holdAgencyForConversationControl,
  readPriorAgencySession,
} from "../session";
import { hasLiveAgencyGoal, isStandaloneContinuationCue } from "../../continuity/longitudinalPolicy";

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

function currentState(status: AgencyState["status"] = "active"): AgencyState {
  return {
    goal: "finish the existing Arbor acceptance checks",
    status,
    currentStep: 7,
    unresolvedWork: ["finish STOP review", "verify hosted state"],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: status === "blocked" ? "external_authority" : null,
    objective: {
      parentGoal: "finish the existing Arbor acceptance checks",
      completionCriteria: ["checks verified"],
      standingAuthorization: ["bounded reversible read-only inspection"],
      hardStops: ["no worker activation", "no production changes"],
      nextAction: "finish STOP review",
      checkpoint: "step 7 verified",
      status,
      revision: 9,
      execution: null,
    },
  };
}

function fakeOwnedStore(initial: AgencyState, staleCheckpoint = false) {
  let stored = initial;
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: {
        user_id: userId,
        project_id: projectId,
        agency_goal: stored.goal,
        agency_status: stored.status,
        agency_current_step: stored.currentStep,
        agency_unresolved_work: stored.unresolvedWork,
        agency_recurring_weaknesses: stored.recurringWeaknesses,
        agency_strategy_notes: stored.strategyNotes,
        agency_blocker: stored.blocker,
        agency_objective: stored.objective,
      },
      error: null,
    })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  const supabase = {
    from: vi.fn((name: string) => {
      if (name !== "arbor_runtime_state") throw new Error("unexpected_table_" + name);
      return query;
    }),
    rpc: vi.fn(async (name: string, args: Record<string, any>) => {
      calls.push({ name, args });
      if (name !== "arbor_record_agency_checkpoint" && name !== "arbor_cas_agency_state")
        throw new Error("unexpected_rpc_" + name);
      if (staleCheckpoint && name === "arbor_record_agency_checkpoint")
        return { data: false, error: null };
      if (args.p_expected_revision !== stored.objective?.revision)
        return { data: false, error: null };
      stored = {
        goal: args.p_goal,
        status: args.p_status,
        currentStep: args.p_current_step,
        unresolvedWork: args.p_unresolved_work,
        recurringWeaknesses: args.p_recurring_weaknesses,
        strategyNotes: args.p_strategy_notes,
        blocker: args.p_blocker,
        objective: args.p_objective,
      };
      return { data: true, error: null };
    }),
  };
  return {
    supabase: supabase as never,
    stored: () => stored,
    calls,
  };
}

describe("owned conversation hold and resume through the durable checkpoint adapter", () => {
  it("preserves an unfinished-goal free state without inventing work on bare GO", async () => {
    const db = fakeOwnedStore({ ...currentState("complete"), unresolvedWork: [] });
    const scope = { supabase: db.supabase, userId, projectId };
    const prior = await readPriorAgencySession(scope);
    expect(prior?.status).toBe("complete");
    expect(hasLiveAgencyGoal(prior)).toBe(false);
    expect(isStandaloneContinuationCue("go")).toBe(true);
    expect(db.calls).toHaveLength(0);
  });

  it("pauses an existing active goal, reads back the checkpoint, then resumes the same goal on GO", async () => {
    const original = currentState();
    const db = fakeOwnedStore(original);
    const scope = { supabase: db.supabase, userId, projectId };

    await expect(holdAgencyForConversationControl(scope)).resolves.toBe(true);
    expect(db.stored()).toMatchObject({
      goal: original.goal,
      status: "checkpointed",
      currentStep: 7,
      unresolvedWork: original.unresolvedWork,
    });
    expect(db.stored().objective?.revision).toBe(10);
    expect(db.calls[0]).toMatchObject({
      name: "arbor_record_agency_checkpoint",
      args: { p_expected_revision: 9, p_status: "checkpointed" },
    });

    const resumed = await beginAgencySession({ ...scope, userText: "go" });
    expect(resumed).toMatchObject({
      goal: original.goal,
      currentStep: original.currentStep,
      unresolvedWork: original.unresolvedWork,
      status: "active",
    });
    expect(resumed.objective?.revision).toBe(11);
    expect(resumed.objective?.standingAuthorization).toEqual(original.objective?.standingAuthorization);
    expect(resumed.objective?.hardStops).toEqual(original.objective?.hardStops);
    expect(db.calls.map(call => call.name)).toEqual([
      "arbor_record_agency_checkpoint",
      "arbor_cas_agency_state",
    ]);
  });

  it("does not reopen a blocked task or clear authority restrictions", async () => {
    const original = currentState("blocked");
    const db = fakeOwnedStore(original);
    const scope = { supabase: db.supabase, userId, projectId };
    await expect(holdAgencyForConversationControl(scope)).resolves.toBe(true);
    expect(db.calls).toHaveLength(0);

    const stillBlocked = await beginAgencySession({ ...scope, userText: "go" });
    expect(stillBlocked.status).toBe("blocked");
    expect(stillBlocked.blocker).toBe("external_authority");
    expect(stillBlocked.objective?.hardStops).toEqual(original.objective?.hardStops);
    expect(db.calls.some(call => /ark_cancel|ark_resume|worker/.test(call.name))).toBe(false);
  });

  it("reports a stale checkpoint conflict instead of claiming that pause succeeded", async () => {
    const db = fakeOwnedStore(currentState(), true);
    await expect(holdAgencyForConversationControl({
      supabase: db.supabase, userId, projectId,
    })).rejects.toThrow("agency_state_conflict");
    expect(db.stored().status).toBe("active");
    expect(db.calls).toHaveLength(1);
  });
});
