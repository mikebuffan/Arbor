import type { SupabaseClient } from "@supabase/supabase-js";
import { validateResearchSession, type ResearchSession } from "./sessionPolicy";
import type { ResearchClaim, ResearchStore } from "./sessionRunner";

type JsonRow = Record<string, unknown>;

function row(value: unknown): JsonRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_research_db_response");
  }
  return value as JsonRow;
}
function requiredString(value: unknown, key: string): string {
  if (typeof value !== "string" || !value) throw new Error("invalid_research_db_" + key);
  return value;
}
function number(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error("invalid_research_db_" + key);
  }
  return value;
}
function sessionFromRow(value: unknown): ResearchSession {
  const r = row(value);
  const result: ResearchSession = {
    id: requiredString(r.id,"id"),
    userId: requiredString(r.user_id,"user_id"),
    projectId: requiredString(r.project_id,"project_id"),
    objective: requiredString(r.objective,"objective"),
    status: requiredString(r.status,"status") as ResearchSession["status"],
    startedAt: requiredString(r.started_at,"started_at"),
    deadlineAt: requiredString(r.deadline_at,"deadline_at"),
    maxWorkUnits: number(r.max_work_units,"max_work_units"),
    consumedWorkUnits: number(r.consumed_work_units,"consumed_work_units"),
    maxCostCents: number(r.max_cost_cents,"max_cost_cents"),
    committedCostCents: number(r.committed_cost_cents,"committed_cost_cents"),
    authorized: r.authorized === true,
    cancellationRequested: r.cancellation_requested === true,
    unresolvedRequiredWork: number(r.unresolved_required_work,"unresolved_required_work"),
    completedEvidenceRefs: Array.isArray(r.completed_evidence_refs)
      ? r.completed_evidence_refs.filter((x):x is string=>typeof x==="string") : [],
  };
  validateResearchSession(result);
  return result;
}

/**
 * Service-role-only adapter for the PROPOSED SQL in docs/research/sql/.
 * MUST be constructed with owner and project IDs resolved by trusted server
 * authorization, never raw unverified client input.
 *
 * It is intentionally not wired to cron or production until sandbox SQL tests
 * and an explicit deployment decision. No fallback to unscoped queries.
 */
export class SupabaseResearchStore implements ResearchStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly ownerId: string,
    private readonly projectId: string,
    private readonly workerId: string,
  ) {
    if (!ownerId || !projectId || !workerId) {
      throw new Error("research_store_requires_scoped_identity");
    }
  }

  private assertScope(session: ResearchSession): void {
    if (session.userId !== this.ownerId || session.projectId !== this.projectId) {
      throw new Error("research_owner_scope_mismatch");
    }
  }

  async loadSession(sessionId: string): Promise<ResearchSession|null> {
    const {data,error} = await this.db.from("arbor_research_sessions")
      .select("*")
      .eq("id",sessionId)
      .eq("user_id",this.ownerId)
      .eq("project_id",this.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const session = sessionFromRow(data);
    this.assertScope(session);
    return session;
  }

  async claimOne(input: {
    session: ResearchSession;
    at: string;
    leaseSeconds: number;
  }): Promise<ResearchClaim|null> {
    this.assertScope(input.session);
    const {data,error} = await this.db.rpc("arbor_claim_research_unit",{
      p_session_id:input.session.id,
      p_user_id:this.ownerId,
      p_project_id:this.projectId,
      p_worker_id:this.workerId,
      p_lease_seconds:input.leaseSeconds,
    });
    if (error) throw error;
    if (data===null) return null;
    const r=row(data);
    return {
      unitId:requiredString(r.unitId,"unitId"),
      leaseToken:requiredString(r.leaseToken,"leaseToken"),
      idempotencyKey:requiredString(r.idempotencyKey,"idempotencyKey"),
      kind:requiredString(r.kind,"kind"),
      payload:row(r.payload),
      maxCostReservationCents:number(r.maxCostReservationCents,"maxCostReservationCents"),
    };
  }

  async settle(input: {
    session: ResearchSession;
    claim: ResearchClaim;
    receipt: import("./sessionPolicy").ResearchUnitReceipt;
  }): Promise<"committed"|"duplicate"|"lease_lost"> {
    this.assertScope(input.session);
    const {data,error} = await this.db.rpc("arbor_settle_research_unit",{
      p_session_id:input.session.id,
      p_user_id:this.ownerId,
      p_project_id:this.projectId,
      p_unit_id:input.claim.unitId,
      p_lease_token:input.claim.leaseToken,
      p_idempotency_key:input.claim.idempotencyKey,
      p_status:input.receipt.status,
      p_cost_cents:input.receipt.costCents,
      p_evidence_refs:input.receipt.evidenceRefs,
      p_unresolved_required_work:input.receipt.unresolvedRequiredWork,
      p_result:{receipt_recorded_at:input.receipt.recordedAt},
    });
    if (error) throw error;
    if (data!=="committed"&&data!=="duplicate"&&data!=="lease_lost") {
      throw new Error("invalid_research_settlement_result");
    }
    return data;
  }

  async stop(input: {
    session: ResearchSession;
    status: "blocked"|"timebox_ended"|"cancelled";
    reason: string;
  }): Promise<void> {
    this.assertScope(input.session);
    const {error} = await this.db.rpc("arbor_stop_research_session",{
      p_session_id:input.session.id,
      p_user_id:this.ownerId,
      p_project_id:this.projectId,
      p_status:input.status,
      p_reason:input.reason,
    });
    if (error) throw error;
  }
}
