import { NextResponse } from "next/server";
import {
  RouteAccessError,
  requireMachineAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";
import { runPreviewArkAcceptanceCycle } from "@/lib/ark/previewAcceptance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requirePreviewAcceptanceGate(req: Request): string {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new RouteAccessError(404, "preview_acceptance_unavailable");
  }
  if (process.env.ARBOR_ENABLE_ARK_PREVIEW_ACCEPTANCE !== "true") {
    throw new RouteAccessError(404, "preview_acceptance_disabled");
  }

  // Reuse the existing machine-auth boundary. Preview-only routing and the
  // dedicated flag narrow availability; they do not make objective IDs into secrets.
  requireMachineAuthorization(req);

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
    const result = await runPreviewArkAcceptanceCycle(objectiveId);

    return NextResponse.json({
      ok: true,
      objectiveId,
      status: result.status,
      claimed: result.claimed,
      completed: result.completed,
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}
