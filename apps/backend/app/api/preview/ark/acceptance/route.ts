import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runDefaultArkWorkerCycle } from "@/lib/ark/defaultWorker";
import { RouteAccessError, routeErrorResponse } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requirePreviewAcceptanceGate(req: Request): string {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new RouteAccessError(404, "preview_acceptance_unavailable");
  }
  if (process.env.ARBOR_ENABLE_ARK_PREVIEW_ACCEPTANCE !== "true") {
    throw new RouteAccessError(404, "preview_acceptance_disabled");
  }

  const configured = process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID?.trim() ?? "";
  if (!UUID_RE.test(configured)) {
    throw new RouteAccessError(409, "preview_acceptance_canary_required");
  }

  const requested = req.headers.get("x-arbor-canary-objective")?.trim() ?? "";
  if (!requested || requested !== configured) {
    throw new RouteAccessError(403, "preview_acceptance_canary_mismatch");
  }

  return configured;
}

export async function POST(req: Request) {
  try {
    const objectiveId = requirePreviewAcceptanceGate(req);
    const result = await runDefaultArkWorkerCycle({
      supabase: supabaseAdmin(),
      workerId: `preview-acceptance:${crypto.randomUUID()}`,
      objectiveId,
      maxTasks: 1,
      maxRuntimeMs: 20_000,
    });

    return NextResponse.json({
      ok: true,
      objectiveId,
      status: result.status,
      processed: result.processed,
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}
