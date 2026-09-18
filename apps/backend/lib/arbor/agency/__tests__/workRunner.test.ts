import { describe, expect, it } from "vitest";
import type { WorkJob } from "../workRunner";

function job(overrides: Partial<WorkJob> = {}): WorkJob {
  return {
    jobId: "job", parentGoal: "finish permanence", status: "running",
    nextAction: "test", unresolvedWork: ["test"], completionCriteria: ["green"],
    checkpoint: null, revision: 4, leaseOwner: "worker-a",
    leaseExpiresAt: "2099-01-01T00:00:00.000Z", ...overrides,
  };
}

describe("ARK autonomous work runner contract", () => {
  it("represents resumable checkpoints without losing the parent goal", () => {
    const before = job();
    const checkpointed = job({
      status: "checkpointed", nextAction: "resume exact step",
      unresolvedWork: ["resume exact step"], leaseOwner: null, leaseExpiresAt: null,
    });
    expect(checkpointed.parentGoal).toBe(before.parentGoal);
    expect(checkpointed.nextAction).toBe("resume exact step");
    expect(checkpointed.status).toBe("checkpointed");
  });

  it("requires completion to have no remaining work in the durable contract", () => {
    const complete = job({
      status: "complete", nextAction: null, unresolvedWork: [],
      leaseOwner: null, leaseExpiresAt: null,
    });
    expect(complete.unresolvedWork).toEqual([]);
    expect(complete.nextAction).toBeNull();
  });
});
