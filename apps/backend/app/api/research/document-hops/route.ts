import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { runPrivilegedDocumentHopTick, stopPrivilegedResearchSession } from "@/lib/research/documentHopPrivilegedBroker";
import { SupabaseResearchStore } from "@/lib/research/supabaseResearchStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Scope = z.object({ projectId: z.string().uuid(), sessionId: z.string().uuid() }).strict();
const Read = Scope.extend({ unitId: z.string().uuid() }).strict();
const Action = z.discriminatedUnion("action", [
  Scope.extend({ action: z.literal("tick"), unitId: z.string().uuid() }).strict(),
  Scope.extend({ action: z.literal("stop") }).strict(),
]);
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
  try {
    const { userId, supabase } = await requireUser(req);
    const parsed = Action.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "invalid_document_hop_request" }, 400);
    const { projectId, sessionId, action } = parsed.data;
    await assertProjectOwnedByUser(supabase, userId, projectId);
    const reader = new SupabaseResearchStore(supabase, userId, projectId, "host-scope-check");
    const session = await reader.loadSession(sessionId);
    if (!session) return json({ ok: false, error: "research_session_not_found" }, 404);
    // STOP remains usable when the submission flag and execution gates are off.
    if (action === "stop") {
      if (["completed", "cancelled", "timebox_ended"].includes(session.status))
        return json({ ok: true, status: session.status, executionRequested: false });
      await stopPrivilegedResearchSession({ userId, projectId, session });
      const settled = await reader.loadSession(sessionId);
      if (!settled || !["completed", "cancelled", "timebox_ended"].includes(settled.status))
        return json({ ok: false, error: "research_stop_not_confirmed", executionRequested: false }, 409);
      return json({ ok: true, status: settled.status, executionRequested: false, inFlightProviderAbortVerified: false });
    }
    if (process.env.ARBOR_ENABLE_STORED_DOCUMENT_HOPS !== "true")
      return json({ ok: false, error: "stored_document_hops_disabled", executionRequested: false }, 409);
    // The existing v6 CHECK requires all flags false. Missing, foreign, broken,
    // or closed integration state cannot be overridden by a host request.
    const { data: gate, error } = await supabase.from("arbor_research_integration_state")
      .select("owner_id,project_id,execution_enabled,scheduler_enabled,real_source_ingestion_enabled,publication_enabled")
      .eq("owner_id", userId).eq("project_id", projectId).maybeSingle();
    if (error) throw error;
    if (!gate || gate.owner_id !== userId || gate.project_id !== projectId || gate.execution_enabled !== true ||
        gate.scheduler_enabled !== false || gate.real_source_ingestion_enabled !== false || gate.publication_enabled !== false)
      return json({ ok: false, error: "document_hop_integration_gate_closed", executionRequested: false }, 409);
    const result = await runPrivilegedDocumentHopTick({ ownerId: userId, projectId,
      workerId: `document-host:${randomUUID()}`, sessionId, unitId: parsed.data.unitId, at: new Date().toISOString(), enabled: true });
    return json({ ok: true, ...result, researchCompletionVerified: false });
  } catch (error) { return failure(error); }
}
