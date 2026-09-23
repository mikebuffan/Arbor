import { NextResponse } from "next/server";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { readPrivateGroveProjects } from "@/lib/grove/privateReadBroker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Private Grove owner grant discovery only. No project names or ARK writes. */
export async function GET(req: Request) {
  try {
    const projects = await readPrivateGroveProjects(req);
    return NextResponse.json(
      { ok: true, projects },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
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
