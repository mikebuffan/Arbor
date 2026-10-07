import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState } from "../../agency/engine";
import type { ArborRuntimeState } from "../runtimeState";
import { loadAgencyState } from "../../agency/state";
import { loadRuntimeState } from "../runtimeStateStore";
import {
  projectExistingDecisionReview,
  readExistingDecisionReview,
} from "../decisionReviewAdapter";

vi.mock("../../agency/state", () => ({ loadAgencyState: vi.fn() }));
vi.mock("../runtimeStateStore", () => ({ loadRuntimeState: vi.fn() }));

const scope = { userId: "owner", projectId: "project", conversationId: "thread" };
const agency = (overrides: Partial<AgencyState> = {}): AgencyState => ({
  goal: "Finish protected Preview review",
  status: "blocked",
  currentStep: 2,
  unresolvedWork: ["await human authorization"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: "external_authority",
  lastVerification: null,
  objective: {
    parentGoal: "Finish protected Preview review",
    completionCriteria: ["accepted live receipt"],
    standingAuthorization: [],
    hardStops: ["do not deploy"],
    nextAction: "request scoped approval",
    checkpoint: "blocked",
    status: "blocked",
    revision: 7,
  },
  ...overrides,
});
const runtime = (overrides: Partial<ArborRuntimeState> = {}): ArborRuntimeState => ({
  schemaVersion: 1,
  userId: "owner", projectId: "project", conversationId: "older-thread",
  channel: "text", activeSubsystem: "arbor",
  currentGoal: "prior goal", lastMeaningfulUserTurn: null,
  lastMeaningfulArborTurn: null,
  agency: null, behaviorProof: null, pendingSelfUpdate: null,
  corrections: [{
    id: "correction-a", kind: "behavior", value: "corrected behavior",
    source: "text", observedAt: "2026-10-07T12:00:00Z",
    confidence: 0.9, protected: false, occurrences: 3,
  }],
  createdAt: "2026-10-07T11:00:00Z",
  updatedAt: "2026-10-07T12:00:00Z",
  ...overrides,
});

describe("existing persisted-state decision review", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the existing owner/project scope and read loaders, without creating a second store", async () => {
    vi.mocked(loadAgencyState).mockResolvedValue(agency());
    vi.mocked(loadRuntimeState).mockResolvedValue(runtime());
    const supabase = {} as SupabaseClient;
    const result = await readExistingDecisionReview({ supabase, scope });
    expect(loadAgencyState).toHaveBeenCalledWith({ supabase, userId: "owner", projectId: "project" });
    expect(loadRuntimeState).toHaveBeenCalledWith({
      supabase, userId: "owner", projectId: "project", conversationId: "thread",
    });
    expect(result.agency?.objectiveRevision).toBe(7);
    expect(result.needsHumanDecisionReview).toBe(true);
    expect(result.humanDecisionReason).toBe("external_authority");
    expect(result.grantsExecution).toBe(false);
    expect(result.grantsMemoryPromotion).toBe(false);
    expect(result.outcomeVerifiedHere).toBe(false);
  });

  it("does not infer that merged corrections originated in the requested conversation", () => {
    const result = projectExistingDecisionReview({ scope, agency: null, runtime: runtime() });
    expect(result.correctionSignals).toEqual([expect.objectContaining({
      id: "correction-a", occurrences: 3,
      origin: "project-merged-unknown-original-conversation",
    })]);
    expect(result.warnings).toContain("merged_correction_origin_unknown");
    expect(result.runtimeSource).toBe("exact-conversation-or-merged-fallback");
    expect(result.needsHumanDecisionReview).toBe(false);
  });

  it("does not equate a completed status with verified completion", () => {
    const result = projectExistingDecisionReview({
      scope, agency: agency({ status: "complete", blocker: null }), runtime: null,
    });
    expect(result.warnings).toContain("unverified_completion");
    expect(result.agency?.lastVerificationOk).toBeNull();
    expect(result.needsHumanDecisionReview).toBe(false);
  });

  it("refuses to guess a human decision when the blocked reason is missing", () => {
    const result = projectExistingDecisionReview({
      scope, agency: agency({ blocker: null }), runtime: null,
    });
    expect(result.warnings).toContain("blocked_without_explicit_reason");
    expect(result.needsHumanDecisionReview).toBe(false);
  });

  it("excludes unrelated, unblocked objectives from the human inbox", () => {
    const result = projectExistingDecisionReview({
      scope, agency: agency({ status: "active", blocker: null }), runtime: null,
    });
    expect(result.needsHumanDecisionReview).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("rejects foreign snapshot ownership without exporting its corrections", () => {
    expect(() => projectExistingDecisionReview({
      scope, agency: null, runtime: runtime({ userId: "intruder" }),
    })).toThrow("decision_review_source_runtime_scope_mismatch");
  });

  it("rejects incomplete scope before calling storage", async () => {
    const invalid = { ...scope, userId: "" };
    await expect(readExistingDecisionReview({
      supabase: {} as SupabaseClient, scope: invalid,
    })).rejects.toThrow("decision_review_source_scope_required");
    expect(loadAgencyState).not.toHaveBeenCalled();
    expect(loadRuntimeState).not.toHaveBeenCalled();
  });

  it("does not swallow an existing loader's storage or access error", async () => {
    vi.mocked(loadAgencyState).mockRejectedValue(new Error("storage denied"));
    vi.mocked(loadRuntimeState).mockResolvedValue(null);
    await expect(readExistingDecisionReview({
      supabase: {} as SupabaseClient, scope,
    })).rejects.toThrow("storage denied");
  });
});
