import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { arkMcpUserContext } from "./context";
import { ARK_PATTERN_HOP_SUBMIT_PERMISSION } from "./taskPermissions";
import { patternHopControlsEnabled, stopPatternHopRun } from "@/lib/memory/patternHopControls";
import { promptDataBlock } from "@/lib/arbor/promptData";

const Request = z.object({ projectId: z.string().uuid(), runId: z.string().uuid() }).strict();
export function registerPatternHopStopTool(server: McpServer) {
  // STOP remains available when new queue submissions are disabled.
  if (!patternHopControlsEnabled()) return;
  server.registerTool("stop_ark_pattern_hop_run", {
    title: "Stop a Pattern Hop Run",
    description: "Request STOP for one owned historical Pattern Hop run. Preserves its last committed checkpoint and permanently prevents further controlled passes on this run ID. Repeated STOP is idempotent. In-flight retrieval may finish; its next controlled save is refused. Requires the same explicit client/project Pattern Hop permission. Does not stop unrelated ARK tasks or public-document research sessions.",
    inputSchema: Request,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (raw, ctx) => {
    const input = Request.parse(raw);
    const auth = ctx.http?.authInfo;
    if (!patternHopControlsEnabled()) throw new Error("pattern_hop_controls_disabled");
    if (!auth?.scopes.includes(ARK_PATTERN_HOP_SUBMIT_PERMISSION) ||
      !Array.isArray(auth.extra?.arkPatternHopProjectIds) || !auth.extra.arkPatternHopProjectIds.includes(input.projectId))
      throw new Error("ark_pattern_hop_control_not_granted");
    const { userId, supabase } = arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase, userId, input.projectId);
    const { data, error } = await supabase.from("arbor_pattern_hop_runs").select("id,user_id,project_id")
      .eq("id", input.runId).eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
    if (error) throw error;
    if (!data || data.id !== input.runId || data.user_id !== userId || data.project_id !== input.projectId)
      throw new Error("pattern_hop_run_not_found");
    const receipt = await stopPatternHopRun({ supabase: supabaseAdmin(), userId, projectId: input.projectId, runId: input.runId });
    return { content: [{ type: "text" as const, text: promptDataBlock("PATTERN HOP STOP RECEIPT", receipt) }], structuredContent: receipt };
  });
}
