import { requireUser } from "@/lib/auth/requireUser";
import { listGroveDocuments, readGroveDocumentQuery } from "@/lib/attachments/groveListing";
import { attachmentErrorResponse, attachmentJsonResponse } from "@/lib/attachments/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only attachment metadata. Access to bytes still requires the existing
/// per-attachment broker, which re-verifies owner/project/conversation scope.
export async function GET(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const scope = readGroveDocumentQuery(new URL(req.url));
    if (!scope) {
      return attachmentJsonResponse(
        req, { ok: false, error: "invalid_request" }, 400,
      );
    }
    const result = await listGroveDocuments({
      supabase, userId, ...scope,
    });
    return attachmentJsonResponse(
      req, { ok: true, projectId: scope.projectId, ...result }, 200,
    );
  } catch (error: unknown) {
    return attachmentErrorResponse(req, error);
  }
}
