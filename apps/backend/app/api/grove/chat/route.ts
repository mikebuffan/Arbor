import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { GroveLmTransportError } from "@/lib/grove/privateLmHostTransport";
import {
  grovePrivateTurnFeatures,
  GrovePrivateRequestError,
  prepareVerifiedPrivateGroveTurn,
  respondToVerifiedPrivateGroveTurn,
} from "@/lib/grove/privateConversationLoop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 4096;
const bodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(3000),
}).strict();

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

/** Prevent oversized/role-spoofed user input before allocating JSON. */
async function boundedBody(req: Request): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(
    req.headers.get("content-type")?.trim() ?? "",
  )) throw new GrovePrivateRequestError(415, "grove_private_content_type");
  if (!req.body)
    throw new GrovePrivateRequestError(400, "grove_private_body_invalid");
  const declared = req.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) &&
      Number(declared) > MAX_REQUEST_BYTES)
    throw new GrovePrivateRequestError(413, "grove_private_body_too_large");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteCount += chunk.value.byteLength;
      if (byteCount > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new GrovePrivateRequestError(413, "grove_private_body_too_large");
      }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof GrovePrivateRequestError ||
        error instanceof RouteAccessError) throw error;
    throw new GrovePrivateRequestError(400, "grove_private_body_invalid");
  } finally {
    reader.releaseLock();
  }
}

/**
 * DRAFT private-only route; inactive unless *both* deployment switches are
 * deliberately set on an approved GROVE host. The Firefly public backend must
 * not set either switch. No user-provided histories, owners, tools, model
 * context, completion receipts or cognitive evidence accepted.
 */
export async function POST(req: Request) {
  const features = grovePrivateTurnFeatures();
  if (!features.chatEnabled || !features.modelEnabled) {
    return reply({ ok: false, error: "grove_private_chat_not_enabled" }, 404);
  }
  try {
    const body = bodySchema.parse(await boundedBody(req));
    const prepared = await prepareVerifiedPrivateGroveTurn({
      request: req, projectId: body.projectId,
      conversationId: body.conversationId, message: body.message,
      features,
    });
    const result = await respondToVerifiedPrivateGroveTurn({
      prepared, features,
    });
    if (result.status === "held") {
      return reply({ ok: false, error: "grove_private_turn_held",
        reason: result.reason, grantsExecution: false }, 409);
    }
    return reply({
      ok: true, reply: result.reply.reply,
      model: result.reply.model,
      replyVerification: result.reply.replyVerification,
      arkConnected: result.reply.arkConnected,
      continuityFetched: result.reply.continuityFetched,
      liveExecutionVerified: false,
      workReceipts: [],
      grantsExecution: false,
      verifiesCompletion: false,
      persisted: false,
    }, 200);
  } catch (error) {
    if (error instanceof z.ZodError)
      return reply({ ok: false, error: "grove_private_body_invalid" }, 400);
    if (error instanceof GrovePrivateRequestError)
      return reply({ ok: false, error: error.code }, error.status);
    if (error instanceof RouteAccessError)
      return reply({ ok: false, error: error.code }, error.status);
    if (error instanceof GroveLmTransportError)
      return reply({ ok: false, error: error.code }, 503);
    return reply({ ok: false, error: "grove_private_turn_unavailable" }, 500);
  }
}
