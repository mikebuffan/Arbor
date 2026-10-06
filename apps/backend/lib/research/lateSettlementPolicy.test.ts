import { describe, expect, it } from "vitest";
import { assessLateResearchSettlement } from "./lateSettlementPolicy";
import type { ResearchSession } from "./sessionPolicy";

const session = (): ResearchSession => ({
  id: "synthetic-session", userId: "synthetic-owner", projectId: "synthetic-project",
  objective: "synthetic test", status: "running", startedAt: "2026-09-22T16:00:00.000Z",
  deadlineAt: "2026-09-22T17:00:00.000Z", maxWorkUnits: 10,
  consumedWorkUnits: 0, maxCostCents: 100, committedCostCents: 0,
  authorized: true, cancellationRequested: false, unresolvedRequiredWork: 1,
  completedEvidenceRefs: [],
});
const check = (patch: Partial<ResearchSession> = {}, at = "2026-09-22T16:59:59.999Z",
  leaseExpiresAt = "2026-09-22T17:00:00.000Z", leaseMatches = true) =>
  assessLateResearchSettlement({ session: { ...session(), ...patch }, at, leaseExpiresAt, leaseMatches });

describe("advisory late research settlement boundary", () => {
  it("allows a pre-deadline matching lease only for an atomic database recheck", () => {
    expect(check()).toEqual({ allowedToAttempt: true, reason: "database_recheck_required" });
  });
  it("rejects exact deadline and after-deadline results despite earlier claims", () => {
    expect(check({}, "2026-09-22T17:00:00.000Z").reason).toBe("session_deadline_reached");
    expect(check({}, "2026-09-22T17:00:00.001Z").allowedToAttempt).toBe(false);
  });
  it("rejects exact lease expiry and mismatched fencing token", () => {
    expect(check({}, "2026-09-22T16:59:59.999Z", "2026-09-22T16:59:59.999Z").reason).toBe("lease_expired");
    expect(check({}, undefined, undefined, false).reason).toBe("lease_lost");
  });
  it("rejects revoked, cancelled, paused, blocked and completed sessions", () => {
    for (const patch of [{ authorized: false }, { cancellationRequested: true },
      { status: "paused" as const }, { status: "blocked" as const },
      { status: "completed" as const }, { status: "timebox_ended" as const }]) {
      expect(check(patch).reason).toBe("session_not_authorized_for_settlement");
    }
  });
  it("rejects pre-start and malformed timestamps", () => {
    expect(check({}, "2026-09-22T15:59:59.999Z").reason).toBe("session_not_started");
    expect(() => check({}, "2026-02-30T16:00:00.000Z")).toThrow("invalid_settlement_timestamp");
  });
});
