import { requireUser } from "@/lib/auth/requireUser";
import { deleteAttachment } from "@/lib/attachments/broker";
import {
  AttachmentDeleteBody,
  attachmentErrorResponse,
  attachmentJsonResponse,
  attachmentOptionsResponse,
} from "@/lib/attachments/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return attachmentOptionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const parsed = AttachmentDeleteBody.safeParse(
      await req.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return attachmentJsonResponse(
        req,
        { ok: false, error: "invalid_request" },
        400,
      );
    }

    await deleteAttachment({
      supabase,
      userId,
      ...parsed.data,
    });

    return attachmentJsonResponse(
      req,
      {
        ok: true,
        attachmentId: parsed.data.attachmentId,
        deleted: true,
      },
      200,
    );
  } catch (error: unknown) {
    return attachmentErrorResponse(req, error);
  }
}
