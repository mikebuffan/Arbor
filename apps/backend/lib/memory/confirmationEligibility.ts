export type ConfirmationOp = {
  mem_key?: unknown;
  key?: unknown;
  mem_value?: unknown;
  value?: unknown;
};

export type PendingConfirmationRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  question: unknown;
  ops: unknown;
  event_type: unknown;
  created_at: string;
};

function isConfirmationOp(value: unknown): value is ConfirmationOp {
  if (!value || typeof value !== "object") return false;
  const op = value as ConfirmationOp;
  const key = String(op.mem_key ?? op.key ?? "").trim();
  const memoryValue = op.mem_value ?? op.value;
  return Boolean(key) && memoryValue != null;
}

export function isEligibleConfirmationCandidate(
  row: PendingConfirmationRow,
): row is PendingConfirmationRow & { question: string; ops: ConfirmationOp[] } {
  return (
    row.event_type == null &&
    typeof row.question === "string" &&
    row.question.trim().length > 0 &&
    row.question !== "memory_event" &&
    Array.isArray(row.ops) &&
    row.ops.length > 0 &&
    row.ops.every(isConfirmationOp)
  );
}

export function selectEligibleConfirmationCandidate(
  rows: PendingConfirmationRow[],
) {
  return rows.find(isEligibleConfirmationCandidate) ?? null;
}
