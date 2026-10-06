import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { savePrivateGroveRuntimeGoal } from "@/lib/grove/privateRuntimeGoalWrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Goal = z.string().trim().min(1).max(500).nullable();
const bodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  expectedCurrentGoal: Goal,
  goal: Goal,
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
    process.env.GROVE_PRIVATE_RUNTIME_GOAL_WRITE_ENABLED !== "true"
  ) {
    return json(
      { ok: false, error: "grove_runtime_goal_write_not_enabled" },
      404,
    );
  }

  try {
    if (
      !(req.headers.get("content-type") ?? "")
        .toLowerCase()
        .startsWith("application/json")
    ) {
      return json(
        { ok: false, error: "grove_runtime_goal_json_required" },
        415,
      );
    }

    const reader = req.body?.getReader();
    if (!reader) {
      return json(
        { ok: false, error: "grove_runtime_goal_body_invalid" },
        400,
      );
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
          return json(
            { ok: false, error: "grove_runtime_goal_body_too_large" },
            413,
          );
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
      return json(
        { ok: false, error: "grove_runtime_goal_body_invalid" },
        400,
      );
    }

    const result = await savePrivateGroveRuntimeGoal({
      request: req,
      ...bodySchema.parse(body),
    });
    return json({
      ok: true,
      ...result,
      grantsExecution: false,
      verifiesCompletion: false,
    }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { ok: false, error: "grove_runtime_goal_body_invalid" },
        400,
      );
    }
    if (error instanceof RouteAccessError) {
      return json({ ok: false, error: error.code }, error.status);
    }
    return json(
      { ok: false, error: "grove_runtime_goal_save_unconfirmed" },
      503,
    );
  }
}
