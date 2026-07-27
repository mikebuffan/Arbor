import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import {
  requireAdminAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    await requireUser(req);
    requireAdminAuthorization(req);

    const { generateWithOpenAI } = await import("@/lib/providers/openai");
    const text = await generateWithOpenAI([
      { role: "system", content: "You are Arbor. Respond briefly." },
      { role: "user", content: "Say 'OpenAI OK' and nothing else." },
    ]);

    return NextResponse.json({ ok: true, text });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}
