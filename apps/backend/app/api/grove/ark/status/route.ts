import { NextResponse } from "next/server";
import { z } from "zod";
import { readPrivateGroveArk } from "@/lib/grove/privateReadBroker";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const projectId = z.string().uuid().parse(
      new URL(req.url).searchParams.get("projectId"),
    );
    const snapshot = await readPrivateGroveArk(req, projectId);
    return NextResponse.json(
      { ok: true, ...snapshot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_project_id" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof RouteAccessError) {
      return NextResponse.json(
        { ok: false, error: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
