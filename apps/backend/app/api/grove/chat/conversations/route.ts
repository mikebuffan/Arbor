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
    const { projectId } = paramsSchema.parse(values);
    const result = await readPrivateGroveConversations(req, projectId);
    return json({
      ok: true, projectId: result.projectId,
      conversations: result.conversations,
      mayBeTruncated: result.mayBeTruncated,
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

/**
 * Explicit private owner action; never auto-create on GET, startup or send.
 * Uses existing Firefly conversations table through Grove's verified broker.
 * POST is not safe to auto-retry if the response is lost; caller refreshes GET.
 * Separate Grove deployment + chat preview flags remain OFF by default.
 */
export async function POST(req: Request) {
  if (!grovePrivateTurnFeatures().chatEnabled)
    return json({ ok: false, error: "grove_private_chat_not_enabled" }, 404);
  try {
    if (!(req.headers.get("content-type") ?? "")
        .toLowerCase().startsWith("application/json"))
      return json({ ok: false, error: "grove_private_json_required" }, 415);
    const text = await req.text();
    if (text.length > 1024)
      return json({ ok: false, error: "grove_private_create_body_invalid" }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch {
      return json({ ok: false, error: "grove_private_create_body_invalid" }, 400);
    }
    const { projectId } = paramsSchema.parse(body);
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
    if (error instanceof RouteAccessError)
      return json({ ok: false, error: error.code }, error.status);
    return json({ ok: false, error: "grove_private_conversation_create_unavailable" }, 500);
  }
}
