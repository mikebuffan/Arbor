import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { SavedResearchHandoff, readSavedResearchCheckpoint } from "@/lib/research/savedResearchHandoff";
import { recordAuthorizedSavedResearchHandoff } from "@/lib/research/savedResearchHandoffBroker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Write = z.object({ projectId: z.string().uuid(), handoff: SavedResearchHandoff }).strict();
const Read = z.object({ projectId: z.string().uuid(), objectiveId: z.string().uuid() }).strict();
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof RouteAccessError) return json({ ok: false, error: error.message }, error.status);
  return json({ ok: false, error: "saved_research_handoff_unavailable" }, 503);
}
export async function GET(req: Request) {
  try {
    const { userId, supabase } = await requireUser(req);
    const parsed = Read.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return json({ ok: false, error: "invalid_saved_research_handoff" }, 400);
    await assertProjectOwnedByUser(supabase, userId, parsed.data.projectId);
    const result = await readSavedResearchCheckpoint(supabase, userId, parsed.data.projectId, parsed.data.objectiveId);
    return result ? json({ ok: true, ...result }) : json({ ok: false, error: "saved_research_checkpoint_not_found" }, 404);
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  try {
    const { userId, supabase } = await requireUser(req);
    // Bound the manual envelope before parsing; no binary files or source intake.
    const body = await req.text();
    if (Buffer.byteLength(body, "utf8") > 256 * 1024) return json({ ok: false, error: "handoff_size_limit" }, 413);
    const parsed = Write.safeParse(await Promise.resolve().then(() => JSON.parse(body)).catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "invalid_saved_research_handoff" }, 400);
    const { projectId, handoff } = parsed.data;
    await assertProjectOwnedByUser(supabase, userId, projectId);
    const result = await recordAuthorizedSavedResearchHandoff({
      supabase,
      userId,
      projectId,
      handoff,
      workerId: `saved-research:${randomUUID()}`,
    });
    return json({ ok: true, ...result });
  } catch (error) { return failure(error); }
}
