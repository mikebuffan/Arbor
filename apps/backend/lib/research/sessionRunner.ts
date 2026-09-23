import {
  decideResearchSession,
  validateResearchUnitReceipt,
  type ResearchSession,
  type ResearchUnitReceipt,
} from "./sessionPolicy";

export type ResearchClaim = {
  unitId: string;
  leaseToken: string;
  idempotencyKey: string;
  kind: string;
  payload: Record<string, unknown>;
  maxCostReservationCents?: number;
};

/**
 * The adapter must atomically scope claims by owner/project/session, lease each
 * unit once, and dedupe settlement by unitId + idempotencyKey + leaseToken.
 */
export type ResearchStore = {
  loadSession(sessionId: string): Promise<ResearchSession | null>;
  claimOne(args: {
    session: ResearchSession;
    at: string;
    leaseSeconds: number;
  }): Promise<ResearchClaim | null>;
  settle(args: {
    session: ResearchSession;
    claim: ResearchClaim;
    receipt: ResearchUnitReceipt;
  }): Promise<"committed" | "duplicate" | "lease_lost">;
  stop(args: {
    session: ResearchSession;
    status: "blocked" | "timebox_ended" | "cancelled";
    reason: string;
  }): Promise<void>;
};

export type ResearchUnitExecutor = (args: {
  session: ResearchSession;
  claim: ResearchClaim;
  remainingMs: number;
  remainingCostCents: number;
  at: string;
}) => Promise<ResearchUnitReceipt>;

/**
 * Exactly one bounded unit per invocation. A scheduler may invoke it again,
 * but this function cannot run unattended on its own and never self-schedules.
 */
export async function runResearchSessionTick(args: {
  sessionId: string;
  store: ResearchStore;
  executor: ResearchUnitExecutor;
  at: string;
}): Promise<
  | { status: "not_found" | "idle" | "no_claim"; reason?: string }
  | { status: "stopped"; reason: string }
  | { status: "committed" | "duplicate" | "lease_lost"; receipt: ResearchUnitReceipt }
> {
  const session = await args.store.loadSession(args.sessionId);
  if (!session) return { status: "not_found" };
  const decision = decideResearchSession(session, args.at);
  if (decision.action === "idle") return { status: "idle", reason: decision.reason };
  if (decision.action === "stop") {
    if ((decision.status === "blocked" || decision.status === "cancelled" ||
      decision.status === "timebox_ended") && decision.status !== session.status) {
      await args.store.stop({ session, status: decision.status, reason: decision.reason });
    }
    return { status: "stopped", reason: decision.reason };
  }
  const claim = await args.store.claimOne({ session, at: args.at, leaseSeconds: 240 });
  if (!claim) return { status: "no_claim" };
  const receipt = await args.executor({
    session, claim, at: args.at,
    remainingMs: decision.remainingMs,
    remainingCostCents: Math.min(decision.remainingCostCents,claim.maxCostReservationCents ?? decision.remainingCostCents),
  });
  if (receipt.unitId !== claim.unitId || receipt.idempotencyKey !== claim.idempotencyKey) {
    throw new Error("research_claim_receipt_mismatch");
  }
  validateResearchUnitReceipt(session, receipt);
  if (claim.maxCostReservationCents !== undefined &&
      (!Number.isSafeInteger(claim.maxCostReservationCents) ||
        claim.maxCostReservationCents < 0 ||
        receipt.costCents > claim.maxCostReservationCents)) {
    throw new Error("research_unit_reservation_exceeded");
  }
  const status = await args.store.settle({ session, claim, receipt });
  return { status, receipt };
}
