import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import {
  assertProjectOwnedByUser,
  getOrCreateConversation,
  getOrCreateDefaultProjectId,
} from "@/lib/chat/thread";
import {
  assertAllowedAttachment,
  attachmentKindFromMime,
  buildAttachmentStoragePath,
  CHAT_ATTACHMENTS_BUCKET,
  sanitizeFilename,
} from "@/lib/chat/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NullableUuid = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().uuid().optional()
);

const Body = z.object({
  projectId: NullableUuid,
  conversationId: NullableUuid,
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.number().int().positive(),
});

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";

  return {
    "access-control-allow-origin": origin,
    "vary": "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { originalFilename, mimeType, sizeBytes } = parsed.data;
    assertAllowedAttachment({ mimeType, sizeBytes });

    const projectId = parsed.data.projectId ?? (await getOrCreateDefaultProjectId(supabase, userId));
    await assertProjectOwnedByUser({ supabase, userId, projectId });

    const conversationId = await getOrCreateConversation({
      supabase,
      userId,
      projectId,
      conversationId: parsed.data.conversationId ?? null,
    });

    const safeFilename = sanitizeFilename(originalFilename);
    const attachmentKind = attachmentKindFromMime(mimeType);
    const attachmentId = crypto.randomUUID();
    const storagePath = buildAttachmentStoragePath({
      userId,
      projectId,
      conversationId,
      attachmentId,
      safeFilename,
    });

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("chat_attachments")
      .insert({
        id: attachmentId,
        user_id: userId,
        project_id: projectId,
        conversation_id: conversationId,
        storage_bucket: CHAT_ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        original_filename: originalFilename,
        safe_filename: safeFilename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        attachment_kind: attachmentKind,
        status: "pending",
        upload_intent_expires_at: expiresAt,
      })
      .select("id, project_id, conversation_id, storage_bucket, storage_path, upload_intent_expires_at")
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        ok: true,
        attachmentId: data.id,
        projectId: data.project_id,
        conversationId: data.conversation_id,
        bucket: data.storage_bucket,
        storagePath: data.storage_path,
        expiresAt: data.upload_intent_expires_at,
      },
      { status: 200, headers: getCorsHeaders(req) }
    );
  } catch (err: any) {
    console.error("attachment intent error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "server_error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
