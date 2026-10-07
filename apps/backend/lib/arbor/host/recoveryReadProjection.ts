/**
 * Read-only recovered-context inspection on the EXISTING One Arbor host.
 *
 * The host continuity view has no authenticated user ID. The trusted API caller
 * must authenticate `scope.userId` and authorize project/conversation access
 * BEFORE supplying these inputs. This function cannot confer that authorization.
 *
 * The durable agency state remains canonical. A host summary is not promoted
 * into a missing agency objective; contradictory host summaries are held for
 * reconciliation instead of silently choosing a newer-looking string.
 */
import type { AgencyState } from "../agency/engine";
import {
  projectConversationRecovery,
  type ConversationRecoveryResult,
  type ConversationRecoveryScope,
  type RecoveryObservation,
} from "../continuity/conversationRecovery";
import type { OneArborHostState } from "./oneArborHostBridge";

export type HostRecoveryReadResult = {
  scope: ConversationRecoveryScope;
  recovery: ConversationRecoveryResult;
  hostGoalStatus: "matched" | "diverged" | "not_comparable";
  next: ConversationRecoveryResult["next"] | "reconcile_host_goal";
  hostSurface: OneArborHostState["surface"];
  hostAuthority: OneArborHostState["authority"];
  /**
   * Matching host/project/conversation is only a consistency check. The
   * authenticated caller remains responsible for access policy and receipts.
   */
  authenticatedHere: false;
  observationsVerifiedHere: false;
  sourceReadOnly: true;
  grantsExecution: false;
  grantsMemoryPromotion: false;
};

function validIdentity(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 && value.length <= 200;
}

export function projectHostRecoveryRead(input: {
  scope: ConversationRecoveryScope;
  host: OneArborHostState;
  agency: AgencyState | null;
  observations: readonly RecoveryObservation[];
}): HostRecoveryReadResult {
  const { scope, host, agency, observations } = input;
  if (!scope || ![scope.userId, scope.projectId, scope.conversationId]
      .every(validIdentity))
    throw Error("host_recovery_scope_required");
  if (!host || host.schemaVersion !== 1 ||
      host.projectId !== scope.projectId ||
      host.conversationId !== scope.conversationId ||
      !validIdentity(host.sessionId) ||
      !Number.isFinite(Date.parse(host.updatedAt)) ||
      !["text", "voice"].includes(host.surface) ||
      !["arbor", "annabelle"].includes(host.authority))
    throw Error("host_recovery_host_scope_mismatch");

  const recovery = projectConversationRecovery({
    scope, agency, observations,
  });
  const durableGoal = agency?.goal.trim() || null;
  const projectedGoal = host.currentGoal?.trim() || null;
  const hostGoalStatus = durableGoal && projectedGoal
    ? durableGoal === projectedGoal ? "matched" as const : "diverged" as const
    : "not_comparable" as const;

  // An existing hard stop outranks even a goal mismatch. Only the real
  // separately authorized objective-control path can remove that blocker.
  const next = recovery.next === "respect_blocker"
    ? "respect_blocker" as const
    : hostGoalStatus === "diverged"
      ? "reconcile_host_goal" as const : recovery.next;

  return {
    scope: { ...scope }, recovery, hostGoalStatus, next,
    hostSurface: host.surface,
    hostAuthority: host.authority,
    authenticatedHere: false,
    observationsVerifiedHere: false,
    sourceReadOnly: true,
    grantsExecution: false,
    grantsMemoryPromotion: false,
  };
}
