import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

const unsupportedResponse = () =>
  NextResponse.json(
    {
      ok: false,
      error: "disappearing_settings_not_available",
    },
    { status: 501 },
  );

/**
 * Closed beta does not yet have a durable user-settings store for this
 * feature. Do not claim a value is enabled or persisted when no backing
 * contract exists.
 */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    return unsupportedResponse();
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser(req);
    return unsupportedResponse();
  } catch (error) {
    return routeErrorResponse(error);
  }
}
