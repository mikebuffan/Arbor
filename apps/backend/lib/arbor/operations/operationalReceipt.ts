export type OperationalReceiptKind =
  | "action"
  | "checkpoint"
  | "completion"
  | "correction"
  | "research_evidence"
  | "authorization"
  | "security_restriction";

export type OperationalReceiptResultState =
  | "prepared"
  | "started"
  | "checkpointed"
  | "completed"
  | "verified"
  | "blocked"
  | "failed"
  | "cancelled"
  | "superseded";

export type OperationalAuthorizationState =
  | "not_applicable"
  | "allowed"
  | "denied"
  | "restricted";

export type OperationalReceiptScope = {
  projectId?: string;
  conversationId?: string;
  turnId?: string;
  objectiveId?: string;
  taskId?: string;
};

export type OperationalReceipt = {
  receiptId: string;
  occurredAt: string;
  kind: OperationalReceiptKind;
  scope: OperationalReceiptScope;
  subsystem: string;
  action: string;
  capability?: string;
  idempotencyKey?: string;
  authorization: {
    state: OperationalAuthorizationState;
    evidenceRefs: readonly string[];
  };
  evidenceRefs: readonly string[];
  result: {
    state: OperationalReceiptResultState;
    resultRef?: string;
    reasonCode?: string;
  };
  supersedesReceiptId?: string;
};

const REASON_RE = /^[a-z0-9][a-z0-9_.:-]{0,199}$/i;

function req(value: unknown, key: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("invalid_operational_receipt_" + key);
  }
  return value.trim();
}

function opt(value: string | undefined, key: string, max = 500): string | undefined {
  if (value === undefined) return undefined;
  return req(value, key, max);
}

function refs(values: readonly string[], key: string): string[] {
  const out = Array.from(
    new Set(values.map(value => req(value, key, 1000))),
  ).sort();
  if (out.length > 100) {
    throw new Error("operational_receipt_" + key + "_limit");
  }
  return out;
}

function iso(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("invalid_operational_receipt_occurred_at");
  }
  return value;
}

function scope(input: OperationalReceiptScope): OperationalReceiptScope {
  const output: OperationalReceiptScope = {};
  if (input.projectId !== undefined) output.projectId = req(input.projectId, "project_id");
  if (input.conversationId !== undefined) output.conversationId = req(input.conversationId, "conversation_id");
  if (input.turnId !== undefined) output.turnId = req(input.turnId, "turn_id");
  if (input.objectiveId !== undefined) output.objectiveId = req(input.objectiveId, "objective_id");
  if (input.taskId !== undefined) output.taskId = req(input.taskId, "task_id");
  if (Object.keys(output).length === 0) {
    throw new Error("operational_receipt_scope_required");
  }
  return output;
}

export function validateOperationalReceipt(
  input: OperationalReceipt,
): OperationalReceipt {
  const reasonCode = input.result.reasonCode;
  if (reasonCode !== undefined && !REASON_RE.test(reasonCode)) {
    throw new Error("invalid_operational_receipt_reason_code");
  }

  if (
    input.authorization.state !== "not_applicable" &&
    input.authorization.evidenceRefs.length === 0
  ) {
    throw new Error("operational_receipt_authorization_evidence_required");
  }

  if (
    input.result.state === "completed" ||
    input.result.state === "verified"
  ) {
    if (input.evidenceRefs.length === 0) {
      throw new Error("operational_receipt_completion_evidence_required");
    }
  }

  if (
    input.kind === "security_restriction" &&
    input.authorization.state !== "restricted"
  ) {
    throw new Error("operational_receipt_security_restriction_mismatch");
  }

  return {
    receiptId: req(input.receiptId, "receipt_id"),
    occurredAt: iso(input.occurredAt),
    kind: input.kind,
    scope: scope(input.scope),
    subsystem: req(input.subsystem, "subsystem", 200),
    action: req(input.action, "action", 300),
    capability: opt(input.capability, "capability", 300),
    idempotencyKey: opt(input.idempotencyKey, "idempotency_key", 500),
    authorization: {
      state: input.authorization.state,
      evidenceRefs: refs(input.authorization.evidenceRefs, "authorization_evidence_ref"),
    },
    evidenceRefs: refs(input.evidenceRefs, "evidence_ref"),
    result: {
      state: input.result.state,
      resultRef: opt(input.result.resultRef, "result_ref", 1000),
      reasonCode,
    },
    supersedesReceiptId: opt(
      input.supersedesReceiptId,
      "supersedes_receipt_id",
      500,
    ),
  };
}

export function buildOperationalReceipt(
  input: OperationalReceipt,
): OperationalReceipt {
  return validateOperationalReceipt(input);
}

/**
 * Deliberately minimal public projection.
 *
 * No raw prompt text, hidden model reasoning, biometric factor detail, secrets,
 * document bodies, or unrestricted metadata map exists in this contract.
 */
export function publicOperationalReceipt(receipt: OperationalReceipt) {
  const valid = validateOperationalReceipt(receipt);
  return {
    receiptId: valid.receiptId,
    occurredAt: valid.occurredAt,
    kind: valid.kind,
    scope: valid.scope,
    subsystem: valid.subsystem,
    action: valid.action,
    capability: valid.capability,
    authorizationState: valid.authorization.state,
    evidenceRefs: valid.evidenceRefs,
    result: valid.result,
    supersedesReceiptId: valid.supersedesReceiptId,
  };
}
