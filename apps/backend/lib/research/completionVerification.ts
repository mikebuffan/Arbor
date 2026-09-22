import { validateResearchSession, validateResearchUnitReceipt, type ResearchSession, type ResearchUnitReceipt } from "./sessionPolicy";

export type CompletionVerification =
  | { verified: true; evidenceRefs: string[] }
  | { verified: false; reason: "required_work_remaining" | "no_completed_receipts" | "missing_required_evidence" | "unresolved_receipt" };

/**
 * Pure completion gate. Queue exhaustion, deadline expiry, budget exhaustion and
 * a zero unresolved counter are not sufficient by themselves. Completion must
 * be supported by completed unit receipts carrying every explicitly required
 * evidence reference. Durable stores must separately fence/atomically persist
 * the transition to `completed`.
 */
export function verifyResearchCompletion(args: {
  session: ResearchSession;
  receipts: readonly ResearchUnitReceipt[];
  requiredEvidenceRefs: readonly string[];
}): CompletionVerification {
  validateResearchSession(args.session);

  if (args.session.unresolvedRequiredWork !== 0) {
    return { verified: false, reason: "required_work_remaining" };
  }

  const required = new Set<string>();
  for (const ref of args.requiredEvidenceRefs) {
    if (typeof ref !== "string" || !ref.trim()) throw new Error("invalid_required_evidence_ref");
    if (required.has(ref)) throw new Error("duplicate_required_evidence_ref");
    required.add(ref);
  }
  if (required.size === 0) return { verified: false, reason: "missing_required_evidence" };

  const completed = args.receipts.filter(receipt => receipt.status === "completed");
  if (completed.length === 0) return { verified: false, reason: "no_completed_receipts" };

  const observed = new Set<string>();
  for (const receipt of completed) {
    validateResearchUnitReceipt(args.session, receipt);
    if (receipt.unresolvedRequiredWork !== 0) {
      return { verified: false, reason: "unresolved_receipt" };
    }
    for (const ref of receipt.evidenceRefs) observed.add(ref);
  }

  for (const ref of required) {
    if (!observed.has(ref)) return { verified: false, reason: "missing_required_evidence" };
  }

  return { verified: true, evidenceRefs: [...required].sort() };
}
