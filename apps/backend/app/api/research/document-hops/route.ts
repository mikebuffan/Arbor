import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { SupabaseResearchStore } from "@/lib/research/supabaseResearchStore";
import { handleDocumentHopAction } from "@/lib/research/documentHopHost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Scope = z.object({ projectId: z.string().uuid(), sessionId: z.string().uuid() }).strict();
const Read = Scope.extend({ unitId: z.string().uuid() }).strict();
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
function failure(error: unknown) {
  if (error instanceof RouteAccessError) return json({ ok: false, error: error.message }, error.status);
  // Never expose SQL, provider messages, credentials or extracted text in errors.
  return json({ ok: false, error: "document_hop_host_unavailable" }, 503);
}

/** Authenticated receipt readback remains available while execution is off. */
export async function GET(req: Request) {
  try {
    const { userId, supabase } = await requireUser(req);
    const parsed = Read.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return json({ ok: false, error: "invalid_document_hop_request" }, 400);
    const { projectId, sessionId, unitId } = parsed.data;
    await assertProjectOwnedByUser(supabase, userId, projectId);
    // User-scoped reads rely on existing owner RLS; no service role for GET.
    const store = new SupabaseResearchStore(supabase, userId, projectId, "receipt-readback");
    const result = await store.loadUnitResult(sessionId, unitId);
    if (!result) return json({ ok: false, error: "document_hop_result_not_found" }, 404);
    return json({ ok: true, result, researchCompletionVerified: false });
  } catch (error) { return failure(error); }
}

export async function POST(req: Request) {
  return handleDocumentHopAction(req);
}
