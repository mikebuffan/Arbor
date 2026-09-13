import { NextResponse } from "next/server";

import { advanceBetaAcceptance } from "@/lib/arbor/betaAcceptanceOrchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINISH_BRANCH = "arbor/backend-beta-finish";

function allowed() {
  return (
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === FINISH_BRANCH
  );
}

export async function GET() {
  if (!allowed()) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await advanceBetaAcceptance();

    return NextResponse.json(result, {
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-arbor-beta-acceptance": "advance",
      },
    });
  } catch {
    console.error("ARBOR_BETA_ACCEPTANCE_ORCHESTRATOR_FAILURE", {
      subsystem: "beta_acceptance",
      code: "acceptance_orchestrator_failure",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "acceptance_orchestrator_failure",
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store, max-age=0",
          "x-arbor-beta-acceptance": "advance",
        },
      },
    );
  }
}
