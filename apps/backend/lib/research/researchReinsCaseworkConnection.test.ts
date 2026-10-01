import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArkClaim } from "../ark/types";
import type { ResearchSession } from "./sessionPolicy";
import { buildArborResearchControllerPlanner } from "./arborResearchControllerPlanner";
import { buildResearchReinsControllerBinding, type ResearchReinsBinding } from "./researchReinsArkHost";
import { selectPersistedFollowupUnits } from "./investigationFollowupPlan";

vi.mock("@/lib/prompt/buildPromptContext", () => ({
  buildPromptContext: vi.fn(async () => ({ systemPrompt: "synthetic", behaviorGuardRequirements: [] })),
}));
vi.mock("./arborResearchControllerPlanner", () => ({
  buildArborResearchControllerPlanner: vi.fn(() => async () => { throw new Error("model must not run"); }),
}));

const run = {
  runId: "run", runStatus: "active", userId: "owner", projectId: "project",
  sessionId: "session", objectiveId: "objective", taskId: "task", goal: "synthetic",
  sourceScope: "project_history", sessionAuthorized: true, cancellationRequested: false,
  authorizationVersion: "synthetic-v1",
} as ResearchReinsBinding;
const claim = {
  objective: { id: "objective", userId: "owner", projectId: "project" },
  task: { id: "task", objectiveId: "objective", userId: "owner", projectId: "project",
    kind: "research.controller.tick", checkpointSequence: 0,
    payload: { ownerId: "forged", projectId: "forged", caseworkStore: "forged" } },
} as unknown as ArkClaim;
const session: ResearchSession = {
  id: "session", userId: "owner", projectId: "project", objective: "synthetic",
  status: "running", authorized: true, cancellationRequested: false,
  startedAt: "2026-10-01T00:00:00Z", deadlineAt: "2026-10-01T01:00:00Z",
  maxWorkUnits: 20, consumedWorkUnits: 0, maxCostCents: 10, committedCostCents: 0,
  unresolvedRequiredWork: 2, completedEvidenceRefs: ["synthetic:source"],
};
const db = {} as SupabaseClient;

describe("trusted ARK host casework connection", () => {
  it("connects host-resolved casework to a resumable follow-up receipt without a model call", async () => {
    const resolver = vi.fn(async (scope) => {
      expect(scope).toEqual({ ownerId: "owner", projectId: "project", sessionId: "session",
        authorizationVersion: "synthetic-v1" });
      expect(Object.isFrozen(scope)).toBe(true);
      return { loadPacket: async () => ({ id: "packet", kind: "followup_plan" as const,
        evidenceRefs: ["synthetic:source"], payload: {
          scopeKey: "owner/project", questions: [{ id: "q", question: "Which original resolves this?",
            evidenceRefs: ["synthetic:source"], sourceRevision: "v1", targets: [{
              targetKey: "original", seed: "Synthetic original document", completionCondition: "Read original",
              fallback: "Read scoped inventory", disconfirmingSearch: "Check an alternative explanation",
              expectedDecisionChange: 5, resolvesUncertainty: 5, addsIndependentLineage: 1,
              acquisitionEffort: 1, maxCostReservationCents: 0,
            }] }], attempts: [], clocks: [], neighborhoods: [], gaps: [], findings: [], corrections: [],
        } }) };
    });
    const binding = await buildResearchReinsControllerBinding({ supabase: db, run, claim,
      resolveCaseworkStore: resolver });
    expect(binding).not.toBeNull();
    expect(buildArborResearchControllerPlanner).toHaveBeenLastCalledWith(expect.objectContaining({
      allowedUnitKinds: expect.arrayContaining(["research.casework"]),
    }));
    const receipt = await binding!.executor({ session, claim: { unitId: "unit", kind: "research.casework",
      payload: { packetId: "packet" }, leaseToken: "lease", idempotencyKey: "once" },
      remainingMs: 1000, remainingCostCents: 10, at: "2026-10-01T00:01:00Z" });
    const restored = JSON.parse(JSON.stringify(receipt));
    const context = { session, units: [], recentReceipts: [{ unitKey: "plan", status: "completed" as const,
      evidenceRefs: restored.evidenceRefs, recordedAt: restored.recordedAt, result: restored.result }] };
    const units = selectPersistedFollowupUnits(context);
    expect(units).toHaveLength(1);
    expect(selectPersistedFollowupUnits({ ...context, units: [{ unitKey: units[0].unitKey,
      kind: units[0].kind, status: "completed", attemptCount: 1, maxAttempts: 2 }] })).toEqual([]);
    expect(restored.result.independentlyVerifiedFinding).toBe(false);
  });

  it("keeps casework unavailable when the host supplies no trusted store", async () => {
    await buildResearchReinsControllerBinding({ supabase: db, run, claim });
    const options = vi.mocked(buildArborResearchControllerPlanner).mock.lastCall![0];
    expect(options.allowedUnitKinds).not.toContain("research.casework");
  });

  it("rejects mismatched scope or revoked authorization before resolving packets", async () => {
    const resolver = vi.fn();
    for (const changed of [
      { ...run, userId: "other" }, { ...run, projectId: "other" },
      { ...run, sessionAuthorized: false }, { ...run, cancellationRequested: true },
    ]) {
      expect(await buildResearchReinsControllerBinding({ supabase: db, run: changed, claim,
        resolveCaseworkStore: resolver })).toBeNull();
    }
    expect(resolver).not.toHaveBeenCalled();
  });

  it("fails closed when trusted packet storage cannot be resolved", async () => {
    await expect(buildResearchReinsControllerBinding({ supabase: db, run, claim,
      resolveCaseworkStore: async () => { throw new Error("storage unavailable"); } }))
      .rejects.toThrow("storage unavailable");
  });
});
