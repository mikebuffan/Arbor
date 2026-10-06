import { validateResearchSession, validateResearchUnitReceipt,
  type ResearchSession, type ResearchUnitReceipt } from "./sessionPolicy";
import { runResearchSessionTick, type ResearchStore, type ResearchUnitExecutor } from "./sessionRunner";

/**
 * Research-side ARK boundary only. The host must derive these values from
 * authenticated persistence; model output and Pattern Hop suggestions cannot
 * create or modify a TrustedResearchHandoff.
 */
export type TrustedResearchHandoff = {
  ownerId: string;
  projectId: string;
  sessionId: string;
  objectiveId: string;
  authorizationVersion: string;
  sourceAccessApproved: boolean;
  privacyReviewRequired: true;
};

export type ArkResearchCheckpoint = {
  kind: "research_checkpoint";
  ownerId: string;
  projectId: string;
  sessionId: string;
  objectiveId: string;
  authorizationVersion: string;
  status: "committed" | "duplicate" | "lease_lost";
  unitId: string;
  idempotencyKey: string;
  receiptStatus: ResearchUnitReceipt["status"];
  evidenceRefs: string[];
  unresolvedRequiredWork: number;
  costCents: number;
  /** A receipt is not independent source corroboration or completed research. */
  independentCorroborationVerified: false;
  grantsExecution: false;
  completionVerified: false;
};

function requireTrustedHandoff(handoff: TrustedResearchHandoff): void {
  if (!handoff.ownerId || !handoff.projectId || !handoff.sessionId ||
      !handoff.objectiveId || !handoff.authorizationVersion ||
      handoff.sourceAccessApproved !== true || handoff.privacyReviewRequired !== true) {
    throw new Error("research_handoff_authorization_required");
  }
}

function assertResearchScope(handoff: TrustedResearchHandoff, session: ResearchSession): void {
  validateResearchSession(session);
  if (session.id !== handoff.sessionId || session.userId !== handoff.ownerId ||
      session.projectId !== handoff.projectId) {
    throw new Error("research_handoff_scope_mismatch");
  }
}

/**
 * No Grove transcript, attachment content, cognitive suggestion, or raw model
 * text is accepted as an authorization input. The research store must still
 * enforce atomic owner/project/session scope and STOP/lease fencing.
 *
 * This function does not persist ARK checkpoints or schedule another tick:
 * the trusted ARK host must persist the returned projection after readback.
 */
export async function runTrustedArkResearchTick(args: {
  handoff: TrustedResearchHandoff;
  store: ResearchStore;
  executor: ResearchUnitExecutor;
  at: string;
}): Promise<
  | { status: "not_found" | "idle" | "no_claim" | "stopped" | "lease_lost"; reason?: string }
  | { status: "committed" | "duplicate"; checkpoint: ArkResearchCheckpoint }
> {
  requireTrustedHandoff(args.handoff);
  const session = await args.store.loadSession(args.handoff.sessionId);
  if (!session) return { status: "not_found" };
  assertResearchScope(args.handoff, session);
  const scopedStore: ResearchStore = {
    loadSession: async (id) => {
      if (id !== args.handoff.sessionId) throw new Error("research_handoff_scope_mismatch");
      // Reload persisted state on every invocation; never trust a chat checkpoint.
      const current = await args.store.loadSession(id);
      if (current) assertResearchScope(args.handoff, current);
      return current;
    },
    claimOne: async (input) => {
      assertResearchScope(args.handoff, input.session);
      return args.store.claimOne(input);
    },
    settle: async (input) => {
      assertResearchScope(args.handoff, input.session);
      validateResearchUnitReceipt(input.session, input.receipt);
      return args.store.settle(input);
    },
    stop: async (input) => {
      assertResearchScope(args.handoff, input.session);
      return args.store.stop(input);
    },
  };
  const result = await runResearchSessionTick({
    sessionId: args.handoff.sessionId, store: scopedStore,
    executor: args.executor, at: args.at,
  });
  if (!("receipt" in result)) return result;
  // A lost lease is NOT a persisted receipt. Neither is a duplicate
  // settlement proof that *this invocation's* proposed receipt matches the
  // earlier one. A trusted readback of the original persisted receipt would
  // be required before exposing its evidence refs to ARK.
  if (result.status === "lease_lost") {
    return { status: "lease_lost", reason: "research_lease_not_committed" };
  }
  if (result.status === "duplicate") {
    return { status: "no_claim", reason: "research_duplicate_requires_receipt_readback" };
  }
  return {
    status: result.status,
    checkpoint: {
      kind: "research_checkpoint",
      ownerId: args.handoff.ownerId,
      projectId: args.handoff.projectId,
      sessionId: args.handoff.sessionId,
      objectiveId: args.handoff.objectiveId,
      authorizationVersion: args.handoff.authorizationVersion,
      status: result.status,
      unitId: result.receipt.unitId,
      idempotencyKey: result.receipt.idempotencyKey,
      receiptStatus: result.receipt.status,
      evidenceRefs: [...result.receipt.evidenceRefs],
      unresolvedRequiredWork: result.receipt.unresolvedRequiredWork,
      costCents: result.receipt.costCents,
      independentCorroborationVerified: false,
      grantsExecution: false,
      completionVerified: false,
    },
  };
}
