import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";
import { readArkProjectSnapshot } from "@/lib/ark/readModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProjectId = z.string().uuid();

export async function GET(req: Request) {
  try {
    const { userId, supabase } = await requireUser(req);
    const url = new URL(req.url);
    const projectId = ProjectId.parse(url.searchParams.get("projectId"));

    await assertProjectOwnedByUser(supabase, userId, projectId);

    const snapshot = await readArkProjectSnapshot({
      supabase,
      userId,
      projectId,
    });

    return NextResponse.json(
      {
        ok: true,
        ...snapshot,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_project_id" },
        { status: 400 },
      );
    }
    return routeErrorResponse(error);
  }
}
