import "server-only";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { authorizePrivateGroveConversation } from "./privateReadBroker";
import { preparePrivateCorrectionSave, type PrivateCorrectionScope } from "./privateCorrectionWritePreparation";
import { createCorrection } from "@/lib/arbor/runtime/corrections";
import { recoverPendingBehaviorCorrections, stageBehaviorCorrectionPromotion } from "@/lib/arbor/runtime/correctionRecovery";
import { loadDurableBehaviorCorrections } from "@/lib/arbor/runtime/correctionPromotion";

/** Independent permission for the three existing GLOBAL behavior calibration
 * keys. It grants neither general memory writes nor runtime/ARK execution. */
export async function authorizePrivateGroveCorrectionWrite(
  req: Request, projectId: string, conversationId: string,
) {
  if (process.env.GROVE_PRIVATE_CORRECTION_WRITE_ENABLED !== "true")
    throw new RouteAccessError(404, "grove_correction_write_not_enabled");
  const bound = await authorizePrivateGroveConversation(req, projectId, conversationId);
  const now = new Date().toISOString();
  const { data, error } = await bound.groveAdmin
    .from("grove_private_correction_write_grants")
    .select("grove_user_id,firefly_user_id,firefly_project_id,firefly_conversation_id,purpose,expires_at,revoked_at")
    .eq("grove_user_id", bound.groveUserId)
    .eq("firefly_user_id", bound.fireflyUserId)
    .eq("firefly_project_id", projectId)
    .eq("firefly_conversation_id", conversationId)
    .eq("purpose", "global_behavior_calibration")
    .is("revoked_at", null).gt("expires_at", now).maybeSingle();
  if (error) throw new RouteAccessError(500, "grove_correction_permission_unavailable");
  if (!data || data.grove_user_id !== bound.groveUserId ||
      data.firefly_user_id !== bound.fireflyUserId ||
      data.firefly_project_id !== projectId || data.firefly_conversation_id !== conversationId ||
      data.purpose !== "global_behavior_calibration" || data.revoked_at !== null ||
      !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= Date.now())
    throw new RouteAccessError(403, "grove_correction_write_not_granted");
  return bound;
}

function scopeOf(bound: Awaited<ReturnType<typeof authorizePrivateGroveCorrectionWrite>>): PrivateCorrectionScope {
  return { groveUserId: bound.groveUserId, fireflyUserId: bound.fireflyUserId,
    projectId: bound.projectId, conversationId: bound.conversationId };
}

/** Explicit user text only: no LM-created correction, client-selected owner,
 * source, confidence, occurrence count or timestamp. No inference is called. */
export async function savePrivateGroveCorrection(input: {
  request: Request; projectId: string; conversationId: string; requestId: string; text: string;
}) {
  const bound = await authorizePrivateGroveCorrectionWrite(input.request, input.projectId, input.conversationId);
  const scope = scopeOf(bound);
  const reauthorize = async () => {
    const current = scopeOf(await authorizePrivateGroveCorrectionWrite(input.request, input.projectId, input.conversationId));
    if ((Object.keys(scope) as (keyof PrivateCorrectionScope)[]).some(k => current[k] !== scope[k]))
      throw new RouteAccessError(403, "grove_correction_access_changed");
    return current;
  };
  const correction = createCorrection({ value: input.text, kind: "behavior", source: "text", observedAt: new Date().toISOString() });
  const staged = await preparePrivateCorrectionSave({ scope, requestId: input.requestId,
    currentUserText: input.text, corrections: [correction] }, {
    supabase: bound.fireflyAdmin, authorizeCorrectionWrite: reauthorize,
    stage: params => stageBehaviorCorrectionPromotion({ ...params,
      writeAuthorization: { kind: "grove_global_behavior_calibration", groveUserId: scope.groveUserId } }),
  });
  if (staged.status !== "staged") return staged;
  // Recover ONLY this UUID through the existing ledger. A bounded Grove grant
  // must not authorize a sweep of unrelated pending saves for the same owner.
  const recovered = await recoverPendingBehaviorCorrections({ supabase: bound.fireflyAdmin,
    userId: bound.fireflyUserId, requestId: input.requestId,
    authorizePromotion: async row => {
      if (row.projectId !== scope.projectId || row.conversationId !== scope.conversationId)
        throw new RouteAccessError(403, "grove_correction_scope_changed");
      await reauthorize();
    },
  });
  await reauthorize();
  const durable = await loadDurableBehaviorCorrections({ supabase: bound.fireflyAdmin, userId: bound.fireflyUserId });
  await reauthorize();
  // A same-UUID retry may find the already-acknowledged job. Verify that exact
  // ledger receipt instead of declaring a successful prior save pending again.
  const { data: receipt, error: receiptError } = await bound.fireflyAdmin.from("memory_pending")
    .select("id,user_id,project_id,event_type,payload,ops")
    .eq("id", input.requestId).eq("user_id", bound.fireflyUserId).is("project_id", null).maybeSingle();
  if (receiptError) throw receiptError;
  await reauthorize();
  const acknowledged = receipt?.id === input.requestId && receipt.user_id === bound.fireflyUserId &&
    receipt.project_id === null && receipt.event_type === "behavior_correction_promotion_complete" &&
    receipt.ops?.kind === "behavior_correction_promotion" && receipt.ops?.version === 1 &&
    receipt.payload?.explicitlyAuthorized === true && receipt.payload?.userId === bound.fireflyUserId &&
    receipt.payload?.writeAuthorization?.kind === "grove_global_behavior_calibration" &&
    receipt.payload?.writeAuthorization?.groveUserId === scope.groveUserId &&
    receipt.payload?.projectId === scope.projectId && receipt.payload?.conversationId === scope.conversationId;
  const permanent = acknowledged && recovered.failed === 0 &&
    durable.some(c => c.id === correction.id && c.value === correction.value);
  return { status: permanent ? "saved" as const : "staged" as const, permanent };
}
