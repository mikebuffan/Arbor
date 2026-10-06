import { describe, expect, it } from "vitest";
import { buildArkHandoff } from "../handoff";
import type { ArkReadSnapshot } from "../readModel";

const capturedAt = "2026-09-21T15:00:00.000Z";

function snapshot(input: Partial<ArkReadSnapshot> = {}): ArkReadSnapshot {
  return {
    available: true,
    capturedAt,
    objectives: [],
    tasks: [],
    checkpoints: [],
    events: [],
    ...input,
  };
}

describe("read-only ARK continuity handoff", () => {
  it("distinguishes unavailable from an available empty project", () => {
    const unavailable = buildArkHandoff(snapshot({ available: false }));
    expect(unavailable.available).toBe(false);
    expect(unavailable.objective).toBeNull();
    expect(unavailable.nextAction).toBeNull();
    expect(unavailable.liveExecutionVerified).toBe(false);

    const idle = buildArkHandoff(snapshot());
    expect(idle.available).toBe(true);
    expect(idle.objective).toBeNull();
    expect(idle.taskCounts.total).toBe(0);
  });

  it("chooses active work, excludes other objective data and keeps provenance", () => {
    const handoff = buildArkHandoff(snapshot({
      objectives: [
        { id: "done", goal: "Old project task", status: "completed",
          completion_evidence: { verifier: "passed" } },
        { id: "live", goal: "Continue investigation", status: "checkpointed",
          updated_at: "2026-09-21T14:50:00Z" },
      ],
      tasks: [
        { objective_id: "live", status: "checkpointed",
          description: "Read next source" },
        { objective_id: "live", status: "completed" },
        { objective_id: "done", status: "failed",
          description: "Sensitive unrelated task" },
      ],
      checkpoints: [
        { id: "cp-1", objective_id: "live", sequence: 1,
          next_action: "Outdated next step", reason: "interruption" },
        { id: "cp-2", objective_id: "live", sequence: 2,
          next_action: "Resume at document 7", reason: "budget",
          created_at: "2026-09-21T14:45:00Z" },
        { id: "cp-other", objective_id: "done", sequence: 20,
          next_action: "Unrelated" },
      ],
      events: [
        { id: 42, objective_id: "live", event_type: "task_checkpointed",
          created_at: "2026-09-21T14:47:00Z" },
        { id: 3, objective_id: "live", event_type: "task_claimed",
          created_at: "2026-09-21T14:00:00Z" },
        { id: 4, objective_id: "done", event_type: "task_completed",
          created_at: "2026-09-21T14:58:00Z" },
      ],
    }));

    expect(handoff.objective).toEqual({
      id: "live",
      goal: "Continue investigation",
      status: "checkpointed",
      updatedAt: "2026-09-21T14:50:00.000Z",
    });
    expect(handoff.checkpoint?.id).toBe("cp-2");
    expect(handoff.nextAction).toBe("Resume at document 7");
    expect(handoff.taskCounts).toMatchObject({ total: 2, completed: 1,
      checkpointed: 1, failed: 0 });
    expect(handoff.lastEvent).toEqual({
      id: "42",
      kind: "task_checkpointed",
      createdAt: "2026-09-21T14:47:00.000Z",
    });
    expect(handoff.completionEvidenceRecorded).toBe(false);
    expect(handoff.liveExecutionVerified).toBe(false);
    expect(JSON.stringify(handoff)).not.toContain("Sensitive unrelated task");
    expect(JSON.stringify(handoff)).not.toContain("Unrelated");
  });

  it("records only explicit authority blockers as decisions, not generic errors", () => {
    const base = { id: "a", goal: "Continue",
      status: "blocked", blocker: {
        kind: "external_authority",
        message: "Approve release before any deployment",
      } };
    const pending = buildArkHandoff(snapshot({ objectives: [base] }));
    expect(pending.blocker).toEqual({
      kind: "external_authority",
      message: "Approve release before any deployment",
      needsOwnerDecision: true,
    });
    expect(pending.nextAction).toBeNull();

    const failed = buildArkHandoff(snapshot({ objectives: [{
      ...base, blocker: {
        kind: "unsupported_capability",
        message: "PDF parser unavailable",
      },
    }] }));
    expect(failed.blocker?.needsOwnerDecision).toBe(false);

    const unstructured = buildArkHandoff(snapshot({ objectives: [{
      ...base, blocker: "Please approve this",
    }] }));
    expect(unstructured.blocker?.needsOwnerDecision).toBe(false);
  });

  it("does not interpret a completion flag as independently verified evidence", () => {
    const missing = buildArkHandoff(snapshot({ objectives: [{
      id: "a", goal: "Investigate", status: "completed",
      completion_evidence: {},
    }] }));
    expect(missing.completionEvidenceRecorded).toBe(false);

    const recorded = buildArkHandoff(snapshot({ objectives: [{
      id: "a", goal: "Investigate", status: "completed",
      completion_evidence: { receipt: "recorded" },
    }] }));
    expect(recorded.completionEvidenceRecorded).toBe(true);
    expect(recorded.liveExecutionVerified).toBe(false);
    expect(recorded.nextAction).toBeNull();
  });

  it("does not accept malformed or cross-objective checkpoint and event claims", () => {
    const result = buildArkHandoff(snapshot({
      objectives: [{ id: "a", goal: "Investigate", status: "checkpointed" }],
      checkpoints: [
        { id: "bad-seq", objective_id: "a", sequence: "5",
          next_action: "Do not use" },
        { id: "wrong", objective_id: "b", sequence: 2,
          next_action: "Do not use either" },
      ],
      events: [
        { id: "bad-event", objective_id: "a",
          event_type: "finished" },
        { id: "wrong-event", objective_id: "b",
          event_type: "finished", created_at: "2026-09-21T14:00:00Z" },
      ],
    }));
    expect(result.checkpoint).toBeNull();
    expect(result.lastEvent).toBeNull();
    expect(result.nextAction).toBeNull();
  });

  it("treats awaiting verification as unresolved and never 'complete'", () => {
    const handoff = buildArkHandoff(snapshot({ objectives: [{
      id: "a", goal: "Check outcome", status: "awaiting_verification",
      completion_evidence: { unverified: true },
    }] }));
    expect(handoff.nextAction).toBe("Verify recorded objective completion.");
    expect(handoff.completionEvidenceRecorded).toBe(false);
  });
});
