/**
 * Optional host-owned Supabase adapter for the cognitive snapshot port.
 * Inert unless a separately reviewed host wires it, creates the proposed
 * table/RPC and passes a user-authenticated, owner-scoped Supabase client.
 * NEVER pass the browser a service-role key or use a service-role client here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CognitiveProjectSnapshot, CognitiveSnapshotPort,
} from "./cognitiveSessionPort";
import type { CognitiveScope } from "./cognitiveAssembly";

const TABLE = "arbor_cognitive_project_state" as const;
const CAS_RPC = "arbor_cas_cognitive_project_state" as const;
function sameScope(a: CognitiveScope, b: CognitiveScope): boolean {
  return !!a.userId.trim() && !!a.projectId.trim() &&
    a.userId === b.userId && a.projectId === b.projectId;
}

export class SupabaseCognitiveStore implements CognitiveSnapshotPort {
  constructor(private readonly client: SupabaseClient) {}

  async read(scope: CognitiveScope): Promise<CognitiveProjectSnapshot | null> {
    if (!scope.userId?.trim() || !scope.projectId?.trim())
      throw new Error("cognitive_store_scope_required");
    const { data, error } = await this.client.from(TABLE)
      .select("user_id,project_id,revision,snapshot")
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.user_id !== scope.userId || data.project_id !== scope.projectId ||
        !data.snapshot || typeof data.snapshot !== "object" ||
        Array.isArray(data.snapshot))
      throw new Error("cognitive_store_row_scope_invalid");
    const snapshot = data.snapshot as CognitiveProjectSnapshot;
    if (!snapshot.scope || !sameScope(scope, snapshot.scope) ||
        snapshot.revision !== data.revision)
      throw new Error("cognitive_store_snapshot_revision_or_scope_invalid");
    return snapshot;
  }

  async compareAndSwap(input: {
    scope: CognitiveScope;
    expectedRevision: number;
    next: CognitiveProjectSnapshot;
  }): Promise<boolean> {
    if (!input.next.scope || !sameScope(input.scope, input.next.scope) ||
        !Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 0 ||
        input.next.revision !== input.expectedRevision + 1)
      throw new Error("cognitive_store_cas_invalid");
    // The approved SQL function must validate auth.uid(), project ownership,
    // inner snapshot scope and revision in the same database transaction.
    const { data, error } = await this.client.rpc(CAS_RPC, {
      p_user_id: input.scope.userId,
      p_project_id: input.scope.projectId,
      p_expected_revision: input.expectedRevision,
      p_next_snapshot: input.next,
    });
    if (error) throw error;
    if (typeof data !== "boolean") throw new Error("cognitive_store_cas_result_invalid");
    return data;
  }
}