import { NextResponse } from "next/server";
import { fireflyHeartbeat } from "@/lib/system/loop";
import {
  requireMachineAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleHeartbeat(req: Request) {
  try {
    requireMachineAuthorization(req);
    await fireflyHeartbeat();
    console.info("[heartbeat] completed");
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

export const GET = handleHeartbeat;
export const POST = handleHeartbeat;
