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

const MAX_DELETE_REQUEST_BYTES = 1024;

async function boundedDeleteBody(req: Request): Promise<unknown> {
  const declared = req.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) &&
      Number(declared) > MAX_DELETE_REQUEST_BYTES)
    throw new RouteAccessError(413, "grove_private_delete_body_too_large");
  if (!req.body)
    throw new RouteAccessError(400, "grove_private_delete_body_invalid");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_DELETE_REQUEST_BYTES) {
        // Reject before buffering the remainder, even if Content-Length lies.
        await reader.cancel().catch(() => undefined);
        throw new RouteAccessError(413, "grove_private_delete_body_too_large");
      }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof RouteAccessError) throw error;
    throw new RouteAccessError(400, "grove_private_delete_body_invalid");
  } finally {
    reader.releaseLock();
  }
}

/** Delete GROVE-SAVED private conversation only, never Firefly records.
 * Explicit request, independent owner+conversation authorization and
 * transactional service-role RPC. Disabled in every ordinary deployment. */
export async function POST(req: Request) {
  const flags = grovePrivateTurnFeatures();
  if (!flags.chatEnabled || !flags.transcriptEnabled || !flags.claimEnabled ||
      process.env.GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED !== "true") {
    return json({ ok: false, error: "grove_private_deletion_not_enabled" },404);
  }
  if (!/^application\/json(?:;|$)/i.test(
    req.headers.get("content-type")?.trim() ?? "",
  ))
    return json({ ok: false, error: "grove_private_json_required" },415);
  try {
    const { projectId, conversationId } =
      bodySchema.parse(await boundedDeleteBody(req));
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
