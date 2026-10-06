import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { runPatternHopResearch, type PatternHopPersistence } from "./patternHopResearch";
import * as store from "./patternHopStore";
import type { PatternHopEvidence, PatternHopEdge } from "./patternHop";

type Scope = { supabase: SupabaseClient; userId: string; projectId: string };
export function patternHopControlsEnabled(): boolean {
  return process.env.ARBOR_ENABLE_PATTERN_HOP_CONTROLS === "true";
}
async function rpc(scope: Scope, name: string, input: Record<string, unknown>) {
  const { data, error } = await scope.supabase.rpc(name, {
    p_user_id: scope.userId, p_project_id: scope.projectId, ...input,
  });
  if (error) throw error;
  return data;
}
export async function stopPatternHopRun(scope: Scope & { runId: string }) {
  const result = await rpc(scope, "arbor_stop_pattern_hop_run", { p_run_id: scope.runId });
  if (result !== "stop_requested") throw new Error("pattern_hop_invalid_stop_receipt");
  return { runId: scope.runId, status: "stop_requested" as const, checkpointPreserved: true as const };
}

/** Uses the same runner and evidence store. Proposed RPCs atomically fence each
 * checkpoint by owner/project/run/token and commit its sources/edges together. */
export async function runControlledPatternHopResearch(params: Parameters<typeof runPatternHopResearch>[0]) {
  if (!patternHopControlsEnabled()) throw new Error("pattern_hop_controls_disabled");
  const scope = { supabase: params.supabase, userId: params.userId, projectId: params.projectId };
  const token = randomUUID();
  let runId: string | null = null;
  let held = false;
  let pendingEvidence: PatternHopEvidence[] = [];
  let pendingEdges: PatternHopEdge[] = [];
  const loadedIds = new Set<string>();
  async function acquire(id: string) {
    const result = await rpc(scope, "arbor_claim_pattern_hop_run", { p_run_id: id, p_lease_token: token });
    if (result !== "claimed") throw new Error(result === "stopped" ? "pattern_hop_stop_requested" : "pattern_hop_run_busy");
    runId = id;
    held = true;
  }
  const renew = async () => {
    if (!held || !runId) throw new Error("pattern_hop_lease_not_acquired");
    const result = await rpc(scope, "arbor_renew_pattern_hop_run", { p_run_id: runId, p_lease_token: token });
    if (result === "stopped") throw new Error("pattern_hop_stop_requested");
    if (result !== "renewed") throw new Error("pattern_hop_run_lease_lost");
  };
  const persistence: PatternHopPersistence = {
    async loadPatternHopRun(input) {
      const initial = await store.loadPatternHopRun(input);
      if (!initial) return null;
      await acquire(initial.id);
      // Acquire before authoritative state read; another worker may have
      // committed between initial lookup and claim.
      const current = await store.loadPatternHopRun(input);
      if (!current) throw new Error("pattern_hop_run_not_found");
      return current;
    },
    async createPatternHopRun(input) {
      const created = await store.createPatternHopRun(input);
      await acquire(created.id);
      const current = await store.loadPatternHopRun({ ...scope, runId: created.id });
      if (!current) throw new Error("pattern_hop_run_not_found");
      return current;
    },
    async loadPatternHopEvidence(input) {
      const evidence = await store.loadPatternHopEvidence(input);
      for (const item of evidence) loadedIds.add(item.id);
      return evidence;
    },
    loadPatternHopEdges: store.loadPatternHopEdges,
    async persistPatternHopEvidence(input) {
      for (const item of input.evidence) if (!loadedIds.has(item.id) && !pendingEvidence.some(e => e.id === item.id)) pendingEvidence.push(item);
      return new Map(input.evidence.map(item => [item.id, item.id]));
    },
    async persistPatternHopEdges(input) { pendingEdges.push(...input.edges); },
    async savePatternHopRun(input) {
      if (!held || input.runId !== runId || input.userId !== scope.userId || input.projectId !== scope.projectId)
        throw new Error("pattern_hop_checkpoint_scope_mismatch");
      const result = await rpc(scope, "arbor_commit_pattern_hop_checkpoint", {
        p_run_id: runId, p_lease_token: token, p_state: input.state,
        p_verification: input.verificationState ?? {}, p_evidence: pendingEvidence, p_edges: pendingEdges,
      });
      if (result === "stopped") throw new Error("pattern_hop_stop_requested");
      if (result !== "committed") throw new Error("pattern_hop_run_lease_lost");
      for (const item of pendingEvidence) loadedIds.add(item.id);
      pendingEvidence = []; pendingEdges = [];
    },
  };
  let executionFailed = false;
  try {
    return await runPatternHopResearch({ ...params, persistence, beforeRetrieval: renew });
  } catch (error) {
    executionFailed = true;
    throw error;
  } finally {
    if (held && runId) {
      try {
        const released = await rpc(scope, "arbor_release_pattern_hop_run", { p_run_id: runId, p_lease_token: token });
        if (released !== "released" && released !== "lease_lost") throw new Error("pattern_hop_invalid_release_receipt");
      } catch (error) {
        if (!executionFailed) throw error;
        // Preserve the execution failure; lease expiry permits later recovery.
        console.warn("[pattern-hop] lease release unavailable after failed pass");
      }
    }
  }
}
