import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import {
  assertStoragePathOwnedByAttachment,
  CHAT_ATTACHMENTS_BUCKET,
  storageObjectExists,
} from "@/lib/chat/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  attachmentId: z.string().uuid(),
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

    const { data: attachment, error: fetchError } = await supabase
      .from("chat_attachments")
      .select("id,user_id,project_id,conversation_id,storage_bucket,storage_path,status,deleted_at,upload_intent_expires_at")
      .eq("id", parsed.data.attachmentId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { ok: false, error: "attachment_not_found" },
        { status: 404, headers: getCorsHeaders(req) }
      );
    }

    if (attachment.deleted_at) {
      return NextResponse.json(
        { ok: false, error: "attachment_deleted" },
        { status: 410, headers: getCorsHeaders(req) }
      );
    }

    if (attachment.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: `attachment_status_${attachment.status}` },
        { status: 409, headers: getCorsHeaders(req) }
      );
    }

    if (Date.parse(attachment.upload_intent_expires_at) <= Date.now()) {
      await supabase
        .from("chat_attachments")
        .update({ status: "failed" })
        .eq("id", attachment.id)
        .eq("user_id", userId);

      return NextResponse.json(
        { ok: false, error: "upload_intent_expired" },
        { status: 410, headers: getCorsHeaders(req) }
      );
    }

    assertStoragePathOwnedByAttachment({
      userId,
      projectId: attachment.project_id,
      conversationId: attachment.conversation_id,
      attachmentId: attachment.id,
      storagePath: attachment.storage_path,
    });

    const exists = await storageObjectExists({
      supabase,
      bucket: CHAT_ATTACHMENTS_BUCKET,
      path: attachment.storage_path,
    });

    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "storage_object_not_found" },
        { status: 404, headers: getCorsHeaders(req) }
      );
    }

    const uploadedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("chat_attachments")
      .update({ status: "uploaded", uploaded_at: uploadedAt })
      .eq("id", attachment.id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (updateError) throw updateError;

    return NextResponse.json(
      { ok: true, attachmentId: attachment.id, status: "uploaded", uploadedAt },
      { status: 200, headers: getCorsHeaders(req) }
    );
  } catch (err: any) {
    console.error("attachment complete error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "server_error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
