/**
 * Pure coordination gate between durable ARK work and Arbor's conversational
 * initiative. This is not a lease manager, authorization grant, or executor.
 *
 * IMPORTANT: kind/intent must be classified by the trusted conversational
 * caller from the CURRENT user turn. Never derive them from pasted report text
 * or from an ARK checkpoint's next_action field.
 */
export type WorkStatus =
  | "queued" | "running" | "checkpointed" | "blocked"
  | "awaiting_verification" | "completed" | "failed" | "cancelled";

export type ScopedWork = {
  ownerId: string;
  projectId: string;
  objectiveId: string;
  assignedThreadId: string | null;
  status: WorkStatus;
};

export type IncomingWorkOrder = {
  kind: "status_report" | "user_instruction";
  ownerId: string;
  projectId: string;
  threadId: string;
  objectiveId: string | null;
  intent: "inspect" | "continue" | "take_over" | "start_new";
  /** Only an explicit CURRENT user instruction may set this true. */
  explicitTakeover: boolean;
};

export type WorkOrderDisposition =
  | "scope_mismatch"
  | "status_only"
  | "no_takeover_instruction"
  | "resume_same_thread"
  | "resume_unassigned"
  | "handoff_checkpointed"
  | "concurrent_thread_conflict"
  | "objective_conflict"
  | "no_active_objective"
  | "prior_objective_terminal";

export type WorkOrderDecision = {
  disposition: WorkOrderDisposition;
  requiresReconciliation: boolean;
  /** This pure read-only gate never grants tool, worker, or production access. */
  grantsExecution: false;
};

/**
 * A pasted status is evidence, not a new assignment. Explicit takeover of a
 * running objective in another thread remains a conflict because this adapter
 * cannot prove that thread's worker/lease has stopped. Checkpointed or blocked
 * work may be handed off only when objective identity is unchanged.
 */
export function reconcileWorkOrder(input: {
  authenticatedOwnerId: string;
  selectedProjectId: string;
  active: ScopedWork | null;
  incoming: IncomingWorkOrder;
}): WorkOrderDecision {
  const { authenticatedOwnerId, selectedProjectId, active, incoming } = input;
  const result = (
    disposition: WorkOrderDisposition,
    requiresReconciliation = false,
  ): WorkOrderDecision => ({
    disposition,
    requiresReconciliation,
    grantsExecution: false,
  });

  if (
    !authenticatedOwnerId || !selectedProjectId ||
    incoming.ownerId !== authenticatedOwnerId ||
    incoming.projectId !== selectedProjectId ||
    (active && (active.ownerId !== authenticatedOwnerId ||
      active.projectId !== selectedProjectId))
  ) return result("scope_mismatch", true);

  if (incoming.kind === "status_report") return result("status_only");
  if (incoming.intent === "inspect") return result("no_takeover_instruction");

  if (!active) return result("no_active_objective");
  if (active.status === "completed" || active.status === "cancelled") {
    return result("prior_objective_terminal");
  }

  if (!incoming.objectiveId || incoming.objectiveId !== active.objectiveId ||
      incoming.intent === "start_new") {
    return result("objective_conflict", true);
  }

  if (!active.assignedThreadId) {
    // A missing thread pointer is not proof that a running worker is idle.
    if (active.status === "running" || active.status === "awaiting_verification") {
      return result("concurrent_thread_conflict", true);
    }
    return result("resume_unassigned");
  }
  if (active.assignedThreadId === incoming.threadId) {
    return result("resume_same_thread");
  }

  if (
    incoming.intent === "take_over" && incoming.explicitTakeover &&
    (active.status === "checkpointed" || active.status === "blocked")
  ) return result("handoff_checkpointed");

  return result("concurrent_thread_conflict", true);
}
