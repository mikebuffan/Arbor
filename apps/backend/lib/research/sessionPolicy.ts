/**
 * Pure bounded-session policy; no scheduler or production side effects.
 * The durable store, not the chat session, owns timestamps and counters.
 */
export type ResearchSessionStatus =
  | "queued" | "running" | "paused" | "blocked" | "timebox_ended"
  | "completed" | "cancelled";

export type ResearchSession = {
  id: string;
  userId: string;
  projectId: string;
  objective: string;
  status: ResearchSessionStatus;
  startedAt: string;
  deadlineAt: string;
  maxWorkUnits: number;
  consumedWorkUnits: number;
  maxCostCents: number;
  committedCostCents: number;
  authorized: boolean;
  cancellationRequested: boolean;
  unresolvedRequiredWork: number;
  completedEvidenceRefs: string[];
};

export type ResearchSessionDecision =
  | { action: "run_one_unit"; remainingMs: number; remainingUnits: number; remainingCostCents: number }
  | { action: "stop"; status: Exclude<ResearchSessionStatus, "queued" | "running">; reason: string }
  | { action: "idle"; reason: string };

export const MAX_SESSION_DURATION_MS = 60 * 60 * 1000;

function milliseconds(iso: string): number {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) throw new Error("invalid_research_session_timestamp");
  return value;
}

function integerInRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error("invalid_" + label);
  }
}

/** Call before creating a durable session. Reject unbounded/reversed windows. */
export function validateResearchSession(session: ResearchSession): void {
  if (!session.id || !session.userId || !session.projectId || !session.objective.trim()) {
    throw new Error("invalid_research_session_identity");
  }
  if (!(["queued", "running", "paused", "blocked", "timebox_ended", "completed",
    "cancelled"] as string[]).includes(session.status)) {
    throw new Error("invalid_research_session_status");
  }
  if (typeof session.authorized !== "boolean" ||
      typeof session.cancellationRequested !== "boolean") {
    throw new Error("invalid_research_session_authorization_state");
  }
  if (!Array.isArray(session.completedEvidenceRefs) ||
      session.completedEvidenceRefs.some(ref => typeof ref !== "string" || !ref.trim())) {
    throw new Error("invalid_research_session_evidence_refs");
  }
  const start = milliseconds(session.startedAt);
  const end = milliseconds(session.deadlineAt);
  if (end <= start || end - start > MAX_SESSION_DURATION_MS) {
    throw new Error("invalid_research_session_duration");
  }
  integerInRange(session.maxWorkUnits, 1, 10000, "max_work_units");
  integerInRange(session.consumedWorkUnits, 0, session.maxWorkUnits, "consumed_work_units");
  integerInRange(session.maxCostCents, 0, 1000000, "max_cost_cents");
  integerInRange(session.committedCostCents, 0, session.maxCostCents, "committed_cost_cents");
  integerInRange(session.unresolvedRequiredWork, 0, 1000000, "unresolved_required_work");
}

/** Timebox expiration must never be represented as research completion. */
export function decideResearchSession(
  session: ResearchSession,
  at: string,
): ResearchSessionDecision {
  validateResearchSession(session);
  const now = milliseconds(at);
  if (session.cancellationRequested || session.status === "cancelled") {
    return { action: "stop", status: "cancelled", reason: "cancelled_by_owner" };
  }
  if (session.status === "completed") {
    return { action: "stop", status: "completed", reason: "already_verified_complete" };
  }
  if (session.status === "timebox_ended") {
    return { action: "stop", status: "timebox_ended", reason: "timebox_already_ended" };
  }
  if (session.status === "paused" || session.status === "blocked") {
    return { action: "stop", status: session.status, reason: "session_" + session.status };
  }
  // A queued session must never execute before its authorized start window.
  // This is an idle state, NOT evidence that the investigation is complete.
  if (now < milliseconds(session.startedAt)) {
    return { action: "idle", reason: "session_not_started" };
  }
  const remainingMs = milliseconds(session.deadlineAt) - now;
  if (remainingMs <= 0) {
    return { action: "stop", status: "timebox_ended", reason: "session_deadline_reached" };
  }
  if (!session.authorized) {
    return { action: "stop", status: "blocked", reason: "authorization_required" };
  }
  const remainingUnits = session.maxWorkUnits - session.consumedWorkUnits;
  const remainingCostCents = session.maxCostCents - session.committedCostCents;
  if (remainingUnits <= 0) {
    return { action: "stop", status: "timebox_ended", reason: "work_unit_budget_exhausted" };
  }
  if (remainingCostCents <= 0) {
    return { action: "stop", status: "timebox_ended", reason: "cost_budget_exhausted" };
  }
  if (session.unresolvedRequiredWork === 0) {
    return { action: "idle", reason: "awaiting_completion_verification" };
  }
  return { action: "run_one_unit", remainingMs, remainingUnits, remainingCostCents };
}

export type ResearchUnitReceipt = {
  sessionId: string;
  unitId: string;
  idempotencyKey: string;
  status: "completed" | "checkpointed" | "blocked" | "failed";
  recordedAt: string;
  costCents: number;
  evidenceRefs: string[];
  unresolvedRequiredWork: number;
};

/** Adapter must still enforce atomic, idempotent settlement and lease fencing. */
export function validateResearchUnitReceipt(
  session: ResearchSession,
  receipt: ResearchUnitReceipt,
): void {
  validateResearchSession(session);
  if (!receipt.unitId || !receipt.idempotencyKey || receipt.sessionId !== session.id) {
    throw new Error("invalid_research_unit_identity");
  }
  milliseconds(receipt.recordedAt);
  integerInRange(receipt.costCents, 0, session.maxCostCents - session.committedCostCents, "unit_cost_cents");
  integerInRange(receipt.unresolvedRequiredWork, 0, 1000000, "receipt_unresolved_work");
  if (!Array.isArray(receipt.evidenceRefs) ||
    receipt.evidenceRefs.some(ref => typeof ref !== "string" || !ref.trim())) {
    throw new Error("invalid_research_evidence_refs");
  }
  // Failed/blocked/checkpointed receipts must not silently reduce required
  // work merely because the "completed" status was omitted. This is a
  // minimal guard; source provenance and true completion still need review.
  if (receipt.evidenceRefs.length === 0 &&
      receipt.unresolvedRequiredWork < session.unresolvedRequiredWork) {
    throw new Error("research_completion_without_evidence");
  }
}
