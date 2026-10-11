import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { deletePrivateGroveConversation } from "@/lib/grove/privateReadBroker";
import { grovePrivateTurnFeatures } from "@/lib/grove/privateConversationLoop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  confirmation: z.literal("DELETE"),
}).strict();
const json = (body: Record<string,unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff" },
  });

/** Delete GROVE-SAVED private conversation only, never Firefly records.
 * Explicit request, independent owner+conversation authorization and
 * transactional service-role RPC. Disabled in every ordinary deployment. */
export async function POST(req: Request) {
  const flags = grovePrivateTurnFeatures();
  if (!flags.chatEnabled || !flags.transcriptEnabled || !flags.claimEnabled ||
      process.env.GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED !== "true") {
    return json({ ok: false, error: "grove_private_deletion_not_enabled" },404);
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase()
      .startsWith("application/json"))
    return json({ ok: false, error: "grove_private_json_required" },415);
  try {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > 1024) return json({ ok: false, error: "grove_private_delete_body_too_large" },413);
    const source = await req.text();
    if (source.length > 1024)
      return json({ ok: false, error: "grove_private_delete_body_too_large" },413);
    let body: unknown;
    try { body = JSON.parse(source); } catch {
      return json({ ok:false,error:"grove_private_delete_body_invalid" },400);
    }
    const { projectId, conversationId } = bodySchema.parse(body);
    await deletePrivateGroveConversation(req, projectId, conversationId);
    return json({
      ok: true, deleted: true, projectId, conversationId,
      scope: "grove_saved_transcript_only",
      grantsExecution: false, verifiesCompletion: false,
    },200);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ ok:false,error:"grove_private_delete_body_invalid" },400);
    if (error instanceof RouteAccessError)
      return json({ ok:false,error:error.code },error.status);
    return json({ ok:false,error:"grove_private_delete_unavailable" },503);
  }
}
