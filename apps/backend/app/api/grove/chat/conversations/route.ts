import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  readPrivateGroveConversations,
  createPrivateGroveConversation,
} from "@/lib/grove/privateReadBroker";
import { grovePrivateTurnFeatures } from "@/lib/grove/privateConversationLoop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
}).strict();
const discoveryQuerySchema = paramsSchema.extend({
  page: z.literal("archive").optional(),
  cursor: z.string().min(1).max(768).optional(),
}).strict().refine(value => !value.cursor || value.page === "archive");

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff" },
  });

/** Read-only. Feature OFF before scope parsing or service-role access.
 * Never creates a conversation, reuses an old public chat selection,
 * exposes other projects, or accepts browser-selected Firefly user IDs.
 * Subsequent POST /api/grove/chat re-checks exact conversation ownership. */
export async function GET(req: Request) {
  if (!grovePrivateTurnFeatures().chatEnabled)
    return json({ ok: false, error: "grove_private_chat_not_enabled" }, 404);
  try {
    const values: Record<string, string> = {};
    for (const [key, value] of new URL(req.url).searchParams) {
      if (Object.prototype.hasOwnProperty.call(values, key))
        return json({ ok: false, error: "grove_private_project_scope_invalid" }, 400);
      values[key] = value;
    }
    const { projectId, page, cursor } = discoveryQuerySchema.parse(values);
    const archive = page === "archive";
    const result = archive
      ? await readPrivateGroveConversations(req, projectId, { enabled: true, cursor })
      : await readPrivateGroveConversations(req, projectId);
    if (archive && !Object.prototype.hasOwnProperty.call(result, "nextCursor"))
      throw new RouteAccessError(500, "grove_private_conversations_unavailable");
    return json({
      ok: true, projectId: result.projectId,
      conversations: result.conversations,
      mayBeTruncated: result.mayBeTruncated,
      ...(archive ? { nextCursor: result.nextCursor } : {}),
      createsConversation: false,
      grantsExecution: false,
    }, 200);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ ok: false, error: "grove_private_project_scope_invalid" }, 400);
    if (error instanceof RouteAccessError)
      return json({ ok: false, error: error.code }, error.status);
    return json({ ok: false, error: "grove_private_conversations_unavailable" }, 500);
  }
}

const MAX_CREATE_REQUEST_BYTES = 1024;

class GroveCreateBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super("grove_private_create_body_invalid");
  }
}

/** Cap actual streamed UTF-8 bytes BEFORE allocating the full owner-write body.
 * Content-Length is advisory: it may be absent, false or attacker-supplied. */
async function boundedCreateBody(req: Request): Promise<unknown> {
  const declared = req.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) &&
      Number(declared) > MAX_CREATE_REQUEST_BYTES)
    throw new GroveCreateBodyError(413);
  if (!req.body) throw new GroveCreateBodyError(400);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_CREATE_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new GroveCreateBodyError(413);
      }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof GroveCreateBodyError) throw error;
    throw new GroveCreateBodyError(400);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Explicit private owner action; never auto-create on GET, startup or send.
 * Uses existing Firefly conversations table through Grove's verified broker.
 * POST is not safe to auto-retry if the response is lost; caller refreshes GET.
 * Separate Grove deployment + chat preview flags remain OFF by default.
 */
export async function POST(req: Request) {
  if (!grovePrivateTurnFeatures().chatEnabled)
    return json({ ok: false, error: "grove_private_chat_not_enabled" }, 404);
  // Read-only chat pilot does not authorize creating Firefly records.
  // Owner must separately enable the new-thread action on the private host.
  if (process.env.GROVE_PRIVATE_NEW_CONVERSATION_ENABLED !== "true")
    return json({ ok: false, error: "grove_private_creation_not_enabled" }, 404);
  try {
    if (!/^application\/json(?:;|$)/i.test(
      req.headers.get("content-type")?.trim() ?? "",
    ))
      return json({ ok: false, error: "grove_private_json_required" }, 415);
    const { projectId } = paramsSchema.parse(await boundedCreateBody(req));
    const conversation = await createPrivateGroveConversation(req, projectId);
    return json({
      ok: true,
      projectId,
      conversation,
      created: true,
      grantsExecution: false,
      verifiesCompletion: false,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ ok: false, error: "grove_private_create_body_invalid" }, 400);
    if (error instanceof GroveCreateBodyError)
      return json({ ok: false, error: error.message }, error.status);
    if (error instanceof RouteAccessError)
      return json({ ok: false, error: error.code }, error.status);
    return json({ ok: false, error: "grove_private_conversation_create_unavailable" }, 500);
  }
}
