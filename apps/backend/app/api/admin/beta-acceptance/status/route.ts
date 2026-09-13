import { NextResponse } from "next/server";

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

  return NextResponse.json(
    {
      ok: true,
      environment: process.env.VERCEL_ENV ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-arbor-beta-acceptance": "status",
      },
    },
  );
}
