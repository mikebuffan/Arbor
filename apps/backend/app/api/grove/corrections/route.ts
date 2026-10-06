import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { savePrivateGroveCorrection } from "@/lib/grove/privateCorrectionWrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({ projectId: z.string().uuid(), conversationId: z.string().uuid(),
  requestId: z.string().uuid(), text: z.string().trim().min(1).max(3000) }).strict();
const json = (body: object, status: number) => NextResponse.json(body, { status,
  headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

export async function POST(req: Request) {
  if (process.env.GROVE_API_ENABLED !== "true" || process.env.GROVE_PRIVATE_CORRECTION_WRITE_ENABLED !== "true")
    return json({ ok: false, error: "grove_correction_write_not_enabled" }, 404);
  try {
    if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
      return json({ ok: false, error: "grove_correction_json_required" }, 415);
    const reader = req.body?.getReader();
    if (!reader) return json({ ok: false, error: "grove_correction_body_invalid" }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 12288) { await reader.cancel(); return json({ ok: false, error: "grove_correction_body_too_large" }, 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return json({ ok: false, error: "grove_correction_body_invalid" }, 400); }
    const result = await savePrivateGroveCorrection({ request: req, ...bodySchema.parse(body) });
    return json({ ok: true, ...result, grantsExecution: false, verifiesCompletion: false },
      result.status === "staged" ? 202 : 200);
  } catch (error) {
    if (error instanceof z.ZodError) return json({ ok: false, error: "grove_correction_body_invalid" }, 400);
    if (error instanceof RouteAccessError) return json({ ok: false, error: error.code }, error.status);
    return json({ ok: false, error: "grove_correction_save_unconfirmed", permanent: false }, 503);
  }
}
