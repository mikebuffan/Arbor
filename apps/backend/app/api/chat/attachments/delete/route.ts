import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  attachmentId: z.string().uuid(),
  reason: z.string().max(240).optional(),
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
      .select("id,user_id,storage_bucket,storage_path,deleted_at")
      .eq("id", parsed.data.attachmentId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { ok: false, error: "attachment_not_found" },
        { status: 404, headers: getCorsHeaders(req) }
      );
    }

    if (!attachment.deleted_at) {
      const { error: removeError } = await supabase.storage
        .from(attachment.storage_bucket)
        .remove([attachment.storage_path]);

      // If the object is already gone, metadata should still be soft-deleted.
      if (removeError) {
        console.warn("attachment storage remove warning", removeError);
      }

      const { error: updateError } = await supabase
        .from("chat_attachments")
        .update({
          status: "deleted",
          deleted_at: new Date().toISOString(),
          delete_reason: parsed.data.reason ?? "user_deleted",
        })
        .eq("id", attachment.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;
    }

    return NextResponse.json(
      { ok: true, attachmentId: attachment.id, deleted: true },
      { status: 200, headers: getCorsHeaders(req) }
    );
  } catch (err: any) {
    console.error("attachment delete error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "server_error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
