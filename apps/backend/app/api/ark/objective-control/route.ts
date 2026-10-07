import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { RouteAccessError, routeErrorResponse } from "@/lib/auth/routeAuthorization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseArkStore } from "@/lib/ark/supabaseStore";
import { isArkObjectiveControlEnabled } from "@/lib/ark/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  action: z.enum(["cancel", "resume"]),
}).strict();

function controlError(error: unknown): RouteAccessError | null {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  if (message.includes("ark_objective_not_found")) {
    return new RouteAccessError(404, "ark_objective_not_found");
  }
  if (message.includes("ark_completed_objective_cannot_cancel")) {
    return new RouteAccessError(409, "ark_completed_objective_cannot_cancel");
  }
  if (message.includes("ark_objective_not_blocked")) {
    return new RouteAccessError(409, "ark_objective_not_blocked");
  }
  if (message.includes("ark_resume_requires_blocked_task")) {
    return new RouteAccessError(409, "ark_resume_requires_blocked_task");
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // Authenticate before parsing so malformed unauthenticated requests do not
    // gain an input-validation oracle.
    const { userId, supabase } = await requireUser(req);
    if (!isArkObjectiveControlEnabled(
      process.env.ARBOR_ENABLE_ARK_OBJECTIVE_CONTROL,
    )) {
      throw new RouteAccessError(404, "ark_objective_control_not_enabled");
    }
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_request" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { projectId, objectiveId, action } = parsed.data;
    await assertProjectOwnedByUser(supabase, userId, projectId);

    // Prove the exact objective is visible inside the authenticated user/project
    // scope BEFORE obtaining a service-role client for the mutation RPC.
    const { data: owned, error: readError } = await supabase
      .from("ark_objectives")
      .select("id")
      .eq("id", objectiveId)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (readError) throw readError;
    if (!owned) throw new RouteAccessError(404, "ark_objective_not_found");

    const store = new SupabaseArkStore(supabaseAdmin());
    const now = new Date().toISOString();
    const objective = action === "cancel"
      ? await store.cancelObjective({ objectiveId, now })
      : await store.resumeBlockedObjective({ objectiveId, now });

    return NextResponse.json(
      {
        ok: true,
        projectId,
        objectiveId: objective.id,
        action,
        status: objective.status,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const mapped = controlError(error);
    return routeErrorResponse(mapped ?? error);
  }
}
