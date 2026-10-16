import "server-only";

import { RouteAccessError } from "@/lib/auth/routeAuthorization";

/**
 * Source-only *seam*, not an external deletion store or signing service.
 * Exact owner/project/conversation IDs come from the verified private broker,
 * never from a user/model-supplied deletion receipt.
 *
 * A real independently controlled durable provider must eventually implement
 * BOTH phases, with an idempotent event ID + authenticated committed watermark.
 * Keeping a record inside the Grove database or its snapshots is not independent
 * custody. Even a caller-configured env flag cannot turn this stub into a writer.
 */
export type GroveDeletionCustodyScope = Readonly<{
  groveUserId: string;
  projectId: string;
  conversationId: string;
}>;
export type GroveDurableDeletionIntent = Readonly<{ eventId: string }>;

export async function reserveIndependentGroveDeletion(
  _scope: GroveDeletionCustodyScope,
): Promise<GroveDurableDeletionIntent> {
  // There is currently no authorized, independently durable provider.
  // Never call the transactional delete RPC unless this receipt is genuine.
  throw new RouteAccessError(500, "grove_private_delete_custody_unavailable");
}

export async function confirmIndependentGroveDeletion(
  _scope: GroveDeletionCustodyScope, _intent: GroveDurableDeletionIntent,
): Promise<void> {
  // If the DB deletion ever succeeds but this confirmation fails, the HTTP
  // result must remain unconfirmed and the persisted intent unresolved.
  throw new RouteAccessError(500, "grove_private_delete_custody_unavailable");
}
