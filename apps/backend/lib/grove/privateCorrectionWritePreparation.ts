import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborCorrection } from "@/lib/arbor/runtime/runtimeState";
import { stageBehaviorCorrectionPromotion } from "@/lib/arbor/runtime/correctionRecovery";
import { correctionPromotionItem } from "@/lib/arbor/runtime/correctionPromotion";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";

export type PrivateCorrectionScope = {
  groveUserId: string; fireflyUserId: string; projectId: string; conversationId: string;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Source preparation only. No route imports this module and no read grant can
 * authorize it. A future reviewed server-side write-grant verifier is required.
 * The verifier must derive identity from authenticated context and recheck active
 * owner/project/conversation access. Never bind it to client or LM assertions. */
export async function preparePrivateCorrectionSave(input: {
  scope: PrivateCorrectionScope; requestId: string; currentUserText: string;
  corrections: ArborCorrection[];
}, deps: {
  supabase: SupabaseClient;
  authorizeCorrectionWrite?: () => Promise<PrivateCorrectionScope | null>;
  stage?: typeof stageBehaviorCorrectionPromotion;
}): Promise<{ status: "held" | "not_requested" | "staged"; permanent: false }> {
  if (!deps.authorizeCorrectionWrite) return { status: "held", permanent: false };
  if (!Object.values(input.scope).every(id => UUID.test(id)) || !UUID.test(input.requestId) ||
      !input.currentUserText.trim() || input.currentUserText.length > 32768 ||
      input.corrections.length > 3) throw new Error("grove_correction_invalid_request");
  if (!hasExplicitDurableAuthorization(input.currentUserText) ||
      !input.corrections.some(c => correctionPromotionItem(c, true)))
    return { status: "not_requested", permanent: false };
  // Immediately before staging: separate explicit write authority, not the read
  // bridge. The existing writer verifies payload and durable UUID readback.
  const authorized = await deps.authorizeCorrectionWrite();
  if (!authorized || (Object.keys(input.scope) as (keyof PrivateCorrectionScope)[])
      .some(key => authorized[key] !== input.scope[key]))
    return { status: "held", permanent: false };
  await (deps.stage ?? stageBehaviorCorrectionPromotion)({
    supabase: deps.supabase, userId: authorized.fireflyUserId,
    projectId: authorized.projectId, conversationId: authorized.conversationId,
    userMessageId: input.requestId, currentUserText: input.currentUserText,
    corrections: input.corrections,
  });
  // Existing recovery/readback decides when a staged correction is permanent.
  return { status: "staged", permanent: false };
}
