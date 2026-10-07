/**
 * Source-only Known / Unknown / Next recovery projection.
 * Host-authenticated observations, not raw-user-emotion inference, must
 * supply the reasons. Reuses canonical agency status, does not mutate it.
 * This is NOT a second agent loop, persistence engine, or tool gateway.
 */
import type { AgencyState } from "../agency/engine";
import { splitAgencyWork } from "../agency/openLoops";

export type ConversationRecoveryScope = {
  userId: string; projectId: string; conversationId: string;
};
export type RecoveryObservationKind =
  | "repeated_unhelpful_reply" | "context_mismatch"
  | "contradictory_completion_claim" | "correction_not_applied"
  | "stable_verified_continuation";

export type RecoveryObservation = ConversationRecoveryScope & {
  id: string;
  observedAt: string;
  kind: RecoveryObservationKind;
  /** Host-reviewed source references, never a model self-assertion. */
  evidenceRefs: string[];
};

export type ConversationRecoveryResult = {
  scope: ConversationRecoveryScope;
  known: { goal: string | null; status: AgencyState["status"] | null;
    nextUnresolvedAction: string | null; blocker: AgencyState["blocker"] | null };
  unknown: Array<"missing_durable_goal" | "no_verified_observations" |
    "completion_requires_proof" | "context_needs_recheck" |
    "reply_loop_needs_recheck" | "correction_needs_recheck">;
  next: "continue_existing_goal" | "recheck_context" |
    "review_correction" | "hold_for_verification" | "ask_for_missing_goal" |
    "respect_blocker" | "no_unfinished_goal";
  observedIssueIds: string[];
  /** A short interface can render Known, Unknown and Next from these fields. */
  requiresReview: boolean;
  observationVerifiedHere: false;
  grantsExecution: false;
  changesAgencyState: false;
  changesIdentity: false;
};

const KINDS: readonly RecoveryObservationKind[] = [
  "repeated_unhelpful_reply", "context_mismatch",
  "contradictory_completion_claim", "correction_not_applied",
  "stable_verified_continuation",
];
const validText = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
function assertScope(scope: ConversationRecoveryScope): void {
  if (!scope || !validText(scope.userId) || !validText(scope.projectId) ||
      !validText(scope.conversationId))
    throw Error("conversation_recovery_scope_required");
}

/**
 * Observations are diagnostic receipts supplied by a trusted host. We cannot
 * detect loops by counting repeated assistant words or copying historical
 * stories. The host must separately verify each evidence reference and owner.
 */
export function projectConversationRecovery(input: {
  scope: ConversationRecoveryScope;
  agency: AgencyState | null;
  observations: readonly RecoveryObservation[];
}): ConversationRecoveryResult {
  assertScope(input.scope);
  if (!Array.isArray(input.observations) || input.observations.length > 40)
    throw Error("conversation_recovery_invalid_input");
  const seen = new Map<string, string>();
  const observed: RecoveryObservation[] = [];
  for (const event of input.observations) {
    if (!event || event.userId !== input.scope.userId ||
        event.projectId !== input.scope.projectId ||
        event.conversationId !== input.scope.conversationId)
      throw Error("conversation_recovery_scope_mismatch");
    if (!validText(event.id) || !validText(event.observedAt, 60) ||
        !Number.isFinite(Date.parse(event.observedAt)) ||
        !KINDS.includes(event.kind) ||
        !Array.isArray(event.evidenceRefs) || event.evidenceRefs.length === 0 ||
        event.evidenceRefs.length > 8 ||
        event.evidenceRefs.some(ref => !validText(ref)))
      throw Error("conversation_recovery_invalid_observation");
    const fingerprint = JSON.stringify([event.observedAt, event.kind,
      [...event.evidenceRefs].sort()]);
    const old = seen.get(event.id);
    if (old && old !== fingerprint)
      throw Error("conversation_recovery_event_conflict");
    if (!old) {
      seen.set(event.id, fingerprint);
      observed.push({ ...event, evidenceRefs: [...event.evidenceRefs] });
    }
  }
  observed.sort((a,b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) ||
    a.id.localeCompare(b.id));

  // A verified stable continuation closes *prior* diagnostic signals, but a
  // later failed reply can still reopen review. Do not erase durable history.
  const lastStable = observed.map((x, i) =>
    x.kind === "stable_verified_continuation" ? i : -1)
    .reduce((a,b) => Math.max(a,b), -1);
  const relevant = observed.slice(lastStable + 1).filter(x =>
    x.kind !== "stable_verified_continuation");
  const kinds = new Set(relevant.map(x => x.kind));
  const repeatedReply = relevant
    .filter(x => x.kind === "repeated_unhelpful_reply");
  const uniqueSources = new Set(repeatedReply.flatMap(x => x.evidenceRefs));
  const loop = repeatedReply.length >= 2 && uniqueSources.size >= 2;
  const conflict = kinds.has("contradictory_completion_claim");
  const correction = kinds.has("correction_not_applied");
  const context = kinds.has("context_mismatch");
  const prior = input.agency;
  const unfinished = prior?.status === "active" ||
    prior?.status === "blocked" || prior?.status === "checkpointed";
  const foreground = prior ? splitAgencyWork(prior.unresolvedWork).current : [];
  const goal = prior?.goal?.trim() || null;
  const blocked = prior?.status === "blocked";
  const unknown: ConversationRecoveryResult["unknown"] = [];
  if (!prior) unknown.push("missing_durable_goal");
  if (!observed.length) unknown.push("no_verified_observations");
  if (conflict) unknown.push("completion_requires_proof");
  if (context) unknown.push("context_needs_recheck");
  if (loop) unknown.push("reply_loop_needs_recheck");
  if (correction) unknown.push("correction_needs_recheck");

  const next: ConversationRecoveryResult["next"] =
    blocked ? "respect_blocker" :
    conflict ? "hold_for_verification" :
    correction ? "review_correction" :
    context || loop ? "recheck_context" :
    !prior ? "ask_for_missing_goal" :
    unfinished ? "continue_existing_goal" : "no_unfinished_goal";

  return {
    scope: { ...input.scope },
    known: {
      goal, status: prior?.status ?? null,
      nextUnresolvedAction: unfinished ? foreground[0] ?? null : null,
      blocker: blocked ? prior?.blocker ?? null : null,
    },
    unknown,
    next,
    observedIssueIds: relevant.filter(x =>
      x.kind !== "repeated_unhelpful_reply" || loop).map(x => x.id),
    requiresReview: next !== "continue_existing_goal" && next !== "no_unfinished_goal",
    observationVerifiedHere: false,
    grantsExecution: false,
    changesAgencyState: false,
    changesIdentity: false,
  };
}
