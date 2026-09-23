import { validateResearchSession, type ResearchSession } from "./sessionPolicy";

/**
 * Advisory pre-settlement check only. The database RPC must recheck under
 * its session/unit locks using database clock_timestamp(); a caller-supplied
 * timestamp or stale session snapshot is never an authorization grant.
 */
export function assessLateResearchSettlement(input: {
  session: ResearchSession;
  at: string;
  leaseExpiresAt: string;
  leaseMatches: boolean;
}): { allowedToAttempt: boolean; reason: string } {
  validateResearchSession(input.session);
  const parse = (value: string): number => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
        !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
      throw new Error("invalid_settlement_timestamp");
    }
    return Date.parse(value);
  };
  const now = parse(input.at);
  const leaseEnd = parse(input.leaseExpiresAt);
  if (!input.leaseMatches) return { allowedToAttempt: false, reason: "lease_lost" };
  if (input.session.cancellationRequested || !input.session.authorized ||
      !["queued", "running"].includes(input.session.status)) {
    return { allowedToAttempt: false, reason: "session_not_authorized_for_settlement" };
  }
  if (now < parse(input.session.startedAt)) {
    return { allowedToAttempt: false, reason: "session_not_started" };
  }
  if (now >= parse(input.session.deadlineAt)) {
    return { allowedToAttempt: false, reason: "session_deadline_reached" };
  }
  if (now >= leaseEnd) return { allowedToAttempt: false, reason: "lease_expired" };
  return { allowedToAttempt: true, reason: "database_recheck_required" };
}
