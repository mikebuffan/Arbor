import type { SupabaseClient } from "@supabase/supabase-js";
import { validateResearchSession, validateResearchUnitReceipt, type ResearchSession } from "./sessionPolicy";
import { validateResearchUnitResult } from "./unitResult";
import type { ResearchClaim } from "./sessionRunner";
import type {
  PlannedResearchUnit,
  ResearchControllerContext,
  ResearchControllerStore,
} from "./researchController";

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
function stringArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value) ||
      value.some(item => typeof item !== "string" || !item.trim())) {
    throw new Error("invalid_research_db_" + key);
  }
  return [...value];
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
export class SupabaseResearchStore implements ResearchControllerStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly ownerId: string,
    private readonly projectId: string,
    private readonly workerId: string,
    private readonly documentUnitId?: string,
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

  async loadControllerContext(sessionId: string): Promise<ResearchControllerContext|null> {
    const session = await this.loadSession(sessionId);
    if (!session) return null;

    const {data:unitRows,error:unitError} = await this.db.from("arbor_research_units")
      .select("unit_key,kind,status,attempt_count,max_attempts")
      .eq("session_id",session.id)
      .eq("user_id",this.ownerId)
      .eq("project_id",this.projectId)
      .order("created_at",{ascending:true});
    if (unitError) throw unitError;

    const {data:receiptRows,error:receiptError} = await this.db.from("arbor_research_receipts")
      .select("idempotency_key,status,evidence_refs,recorded_at")
      .eq("session_id",session.id)
      .eq("user_id",this.ownerId)
      .eq("project_id",this.projectId)
      .order("recorded_at",{ascending:false})
      .limit(50);
    if (receiptError) throw receiptError;

    const units = (unitRows ?? []).map((value:unknown) => {
      const r=row(value);
      const status=requiredString(r.status,"unit_status");
      if (!["queued","leased","completed","blocked","failed","cancelled"].includes(status)) {
        throw new Error("invalid_research_db_unit_status");
      }
      return {
        unitKey:requiredString(r.unit_key,"unit_key"),
        kind:requiredString(r.kind,"unit_kind"),
        status:status as ResearchControllerContext["units"][number]["status"],
        attemptCount:number(r.attempt_count,"unit_attempt_count"),
        maxAttempts:number(r.max_attempts,"unit_max_attempts"),
      };
    });

    const recentReceipts = (receiptRows ?? []).map((value:unknown) => {
      const r=row(value);
      const status=requiredString(r.status,"receipt_status");
      if (!["completed","checkpointed","blocked","failed"].includes(status)) {
        throw new Error("invalid_research_db_receipt_status");
      }
      return {
        unitKey:requiredString(r.idempotency_key,"receipt_idempotency_key"),
        status:status as ResearchControllerContext["recentReceipts"][number]["status"],
        evidenceRefs:stringArray(r.evidence_refs,"receipt_evidence_refs"),
        recordedAt:requiredString(r.recorded_at,"receipt_recorded_at"),
      };
    });

    return {session,units,recentReceipts};
  }

  async appendPlannedUnits(input: {
    session: ResearchSession;
    units: PlannedResearchUnit[];
  }): Promise<{appended:number;existing:number}> {
    this.assertScope(input.session);
    const {data,error} = await this.db.rpc("arbor_append_research_units",{
      p_session_id:input.session.id,
      p_user_id:this.ownerId,
      p_project_id:this.projectId,
      p_units:input.units.map((unit) => ({
        unitKey:unit.unitKey,
        kind:unit.kind,
        description:unit.description,
        payload:unit.payload,
        maxCostReservationCents:unit.maxCostReservationCents,
        maxAttempts:unit.maxAttempts ?? 3,
      })),
    });
    if (error) throw error;
    const r=row(data);
    return {
      appended:number(r.appended,"controller_appended"),
      existing:number(r.existing,"controller_existing"),
    };
  }

  async claimOne(input: {
    session: ResearchSession;
    at: string;
    leaseSeconds: number;
  }): Promise<ResearchClaim|null> {
    this.assertScope(input.session);
    const {data,error} = await this.db.rpc(this.documentUnitId ? "arbor_claim_document_hop_unit" : "arbor_claim_research_unit",{
      p_session_id:input.session.id,
      p_user_id:this.ownerId,
      p_project_id:this.projectId,
      p_worker_id:this.workerId,
      p_lease_seconds:input.leaseSeconds,
      ...(this.documentUnitId ? { p_unit_id: this.documentUnitId } : {}),
    });
    if (error) throw error;
    if (data===null) return null;
    const r=row(data);
    if (this.documentUnitId && (r.unitId !== this.documentUnitId || r.kind !== "document_pattern_hop_search")) {
      throw new Error("document_hop_claim_scope_mismatch");
    }
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
    validateResearchUnitReceipt(input.session, input.receipt);
    if (input.receipt.unitId !== input.claim.unitId || input.receipt.idempotencyKey !== input.claim.idempotencyKey) {
      throw new Error("research_claim_receipt_mismatch");
    }
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
      p_result:{receipt_recorded_at:input.receipt.recordedAt,
        ...(input.receipt.result === undefined ? {} : { unit_result: input.receipt.result })},
    });
    if (error) throw error;
    if (data!=="committed"&&data!=="duplicate"&&data!=="lease_lost") {
      throw new Error("invalid_research_settlement_result");
    }
    return data;
  }

  /** Reload a committed unit result after restart; never re-run its search. */
  async loadUnitResult(sessionId: string, unitId: string, completedOnly = false): Promise<Record<string, unknown> | null> {
    let query = this.db.from("arbor_research_receipts")
      .select("session_id,unit_id,user_id,project_id,status,result")
      .eq("session_id", sessionId).eq("unit_id", unitId)
      .eq("user_id", this.ownerId).eq("project_id", this.projectId);
    if (completedOnly) query = query.eq("status", "completed");
    const { data, error } = await query.order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = row(data);
    if (completedOnly && r.status !== "completed") throw new Error("document_hop_receipt_status_mismatch");
    if (r.user_id !== this.ownerId || r.project_id !== this.projectId || r.session_id !== sessionId || r.unit_id !== unitId) {
      throw new Error("research_owner_scope_mismatch");
    }
    const result = row(r.result).unit_result;
    if (result === undefined) return null; // Older timestamp-only receipts.
    validateResearchUnitResult(result);
    return result;
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
