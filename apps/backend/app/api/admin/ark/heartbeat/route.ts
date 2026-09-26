/**
 * REVIEW ONLY, NO CRON CONFIGURATION: independently invoke one approved
 * canary objective. Do not deploy until owner reviews existing host routing,
 * scheduling, environment flags, security and exact branch/CI.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireMachineAuthorization, routeErrorResponse } from "@/lib/auth/routeAuthorization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runDefaultArkWorkerCycle } from "@/lib/ark/defaultWorker";
import { runDedicatedArkHeartbeat } from "@/lib/ark/dedicatedHeartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    requireMachineAuthorization(req);
    const flags = {
      ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: process.env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT,
      ARK_PREVIEW_MCP_READONLY_HOST: process.env.ARK_PREVIEW_MCP_READONLY_HOST,
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: process.env.ARBOR_ARK_ENABLE_LIVE_EXECUTION,
      ARBOR_ENABLE_ARK_EXECUTION: process.env.ARBOR_ENABLE_ARK_EXECUTION,
      ARBOR_ARK_CANARY_OBJECTIVE_ID: process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID,
      ARBOR_ARK_ALLOW_GLOBAL_EXECUTION: process.env.ARBOR_ARK_ALLOW_GLOBAL_EXECUTION,
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    };
    const result = await runDedicatedArkHeartbeat({
      flags,
      workerId: `dedicated-ark:${randomUUID()}`,
      runCycle: ({ objectiveId, workerId, maxTasks, maxRuntimeMs }) =>
        runDefaultArkWorkerCycle({
          supabase: supabaseAdmin(),
          objectiveId,
          workerId,
          maxTasks,
          maxRuntimeMs,
          enableCheckpointCanary:
            process.env.ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY === "true",
        }),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}
export const GET = handler;
export const POST = handler;
