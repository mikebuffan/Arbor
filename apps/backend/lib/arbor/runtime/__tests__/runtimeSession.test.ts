import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildArborBehaviorProjection,
} from "../../behavior/behaviorProjection";

import {
  beginSelfUpdate,
} from "../../agency/updateLifecycle";

import {
  carryPendingSelfUpdate,
  beginRuntimeSession,
} from "../runtimeSession";
import { loadRuntimeState, saveRuntimeState } from "../runtimeStateStore";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborRuntimeState } from "../runtimeState";

vi.mock("../runtimeStateStore", () => ({ loadRuntimeState: vi.fn(), saveRuntimeState: vi.fn() }));

const behavior =
  buildArborBehaviorProjection({
    mode: "text",
  }).proof;

function pending(
  id: string,
) {
  return beginSelfUpdate({
    id,
    strategy:
      "verify before claiming complete",
    baselineScore: 0.4,
    behavior,
    protectedCorrections: [],
    now:
      "2026-09-10T21:00:00.000Z",
  });
}

describe(
  "runtime self-update continuity",
  () => {
    it("honors an explicitly cleared goal while an omitted goal resumes the saved one", async () => {
      const prior: ArborRuntimeState = { schemaVersion: 1, userId: "owner", projectId: "project",
        conversationId: "thread", channel: "text", activeSubsystem: "arbor",
        currentGoal: "completed task", lastMeaningfulUserTurn: "saved", lastMeaningfulArborTurn: "saved",
        agency: null, corrections: [], behaviorProof: null, pendingSelfUpdate: null,
        createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:01:00Z" };
      vi.mocked(loadRuntimeState).mockResolvedValue(prior);
      vi.mocked(saveRuntimeState).mockResolvedValue();
      const input = { supabase: {} as SupabaseClient, userId: "owner", projectId: "project",
        conversationId: "thread", channel: "text" as const, activeSubsystem: "arbor" as const,
        now: "2026-10-01T00:02:00Z" };
      expect((await beginRuntimeSession(input)).currentGoal).toBe("completed task");
      expect((await beginRuntimeSession({ ...input, currentGoal: null })).currentGoal).toBeNull();
      expect(saveRuntimeState).toHaveBeenLastCalledWith(expect.objectContaining({
        state: expect.objectContaining({ currentGoal: null }),
      }));
    });
    it(
      "carries a pending update while the same goal continues",
      () => {
        const candidate =
          pending("same-goal");

        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "finish voice integration",
            priorPending:
              candidate,
          }),
        ).toBe(candidate);
      },
    );

    it(
      "carries a pending behavioral update across task changes",
      () => {
        const candidate =
          pending("cross-goal");

        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "write a refund email",
            priorPending:
              candidate,
          }),
        ).toBe(candidate);
      },
    );

    it(
      "honors an explicit incoming clear",
      () => {
        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "finish voice integration",
            nextGoal:
              "finish voice integration",
            priorPending:
              pending("existing"),
            incomingPending: null,
          }),
        ).toBeNull();
      },
    );

    it(
      "honors an explicit incoming candidate",
      () => {
        const incoming =
          pending("incoming");

        expect(
          carryPendingSelfUpdate({
            priorGoal:
              "old goal",
            nextGoal:
              "new goal",
            priorPending:
              pending("old"),
            incomingPending:
              incoming,
          }),
        ).toBe(incoming);
      },
    );
  },
);
