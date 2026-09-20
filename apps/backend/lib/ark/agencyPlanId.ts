import { createHash } from "node:crypto";
import { agencyOperationKey } from "@/lib/arbor/agency/idempotency";

export function arkAgencyPlanId(input: {
  turnId: string;
  toolName: string;
  args: Record<string, unknown>;
}): string {
  const raw = agencyOperationKey(input);
  return `ark:${createHash("sha256").update(raw).digest("hex")}`;
}
