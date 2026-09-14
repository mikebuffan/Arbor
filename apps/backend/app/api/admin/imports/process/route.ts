import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";
import { processConversationImportBatch } from "@/lib/imports/processConversationImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  batchSize: z.number().int().min(1).max(96).optional(),
  maxBatches: z.number().int().min(1).max(8).optional(),
});

async function handle(req: Request) {
  try {
    requireMachineAuthorization(req);

    const body =
      req.method === "POST"
        ? await req.json().catch(() => ({}))
        : {};

    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const maxBatches = parsed.data.maxBatches ?? 4;
    const results = [];

    for (let i = 0; i < maxBatches; i += 1) {
      const result = await processConversationImportBatch({
        batchSize: parsed.data.batchSize,
      });
      results.push(result);

      if (
        result.status === "idle" ||
        result.status === "completed" ||
        result.status === "failed"
      ) {
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;
