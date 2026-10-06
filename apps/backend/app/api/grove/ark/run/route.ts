import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  grovePrivateArkExecutionEnabled,
  runPrivateGroveArkObjective,
} from "@/lib/grove/privateArkObjectiveRun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  requestId: z.string().uuid(),
}).strict();

const json = (body: object, status: number) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export async function POST(req: Request) {
  if (
    process.env.GROVE_API_ENABLED !== "true" ||
    !grovePrivateArkExecutionEnabled()
  ) {
    return json({ ok: false, error: "grove_ark_execution_not_enabled" }, 404);
  }

  try {
    if (
      !(req.headers.get("content-type") ?? "")
        .toLowerCase()
        .startsWith("application/json")
    ) {
      return json({ ok: false, error: "grove_ark_json_required" }, 415);
    }

    const reader = req.body?.getReader();
    if (!reader) {
      return json({ ok: false, error: "grove_ark_body_invalid" }, 400);
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return json({ ok: false, error: "grove_ark_body_too_large" }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json({ ok: false, error: "grove_ark_body_invalid" }, 400);
    }

    const result = await runPrivateGroveArkObjective({
      request: req,
      ...bodySchema.parse(body),
    });
    return json({
      ok: true,
      ...result,
      grantsExecution: true,
    }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ ok: false, error: "grove_ark_body_invalid" }, 400);
    }
    if (error instanceof RouteAccessError) {
      return json({ ok: false, error: error.code }, error.status);
    }
    return json({ ok: false, error: "grove_ark_execution_unconfirmed" }, 503);
  }
}
