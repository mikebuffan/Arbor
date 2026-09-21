import { describe, expect, it, vi } from "vitest";
import {
  decideResearchSession, validateResearchSession, validateResearchUnitReceipt,
  type ResearchSession,
} from "./sessionPolicy";
import { runResearchSessionTick, type ResearchStore } from "./sessionRunner";

const at = "2026-09-20T18:40:00.000Z";
const baseline = (): ResearchSession => ({
  id: "session-1", userId: "owner-1", projectId: "epstein-investigation",
  objective: "Trace June 2009 NPA correspondence", status: "running",
  startedAt: "2026-09-20T18:00:00.000Z", deadlineAt: "2026-09-20T19:00:00.000Z",
  maxWorkUnits: 60, consumedWorkUnits: 4, maxCostCents: 500,
  committedCostCents: 75, authorized: true, cancellationRequested: false,
  unresolvedRequiredWork: 10, completedEvidenceRefs: ["EFTA00183759"],
});

describe("bounded durable research-session policy", () => {
  it("allows one unit within exactly a one-hour window", () => {
    expect(decideResearchSession(baseline(), at)).toEqual({
      action: "run_one_unit", remainingMs: 1200000,
      remainingUnits: 56, remainingCostCents: 425,
    });
  });
  it("rejects malformed persisted status and evidence before any work is claimed", () => {
    expect(() => validateResearchSession({
      ...baseline(), status: "invented" as ResearchSession["status"],
    })).toThrow("invalid_research_session_status");
    expect(() => validateResearchSession({
      ...baseline(), authorized: "yes" as unknown as boolean,
    })).toThrow("invalid_research_session_authorization_state");
    expect(() => validateResearchSession({
      ...baseline(), completedEvidenceRefs: ["EFTA00183759", " "],
    })).toThrow("invalid_research_session_evidence_refs");
  });
  it("rejects >60-minute and reversed timeboxes", () => {
    expect(() => validateResearchSession({
      ...baseline(), deadlineAt: "2026-09-20T19:00:00.001Z",
    })).toThrow("invalid_research_session_duration");
    expect(() => validateResearchSession({
      ...baseline(), deadlineAt: "2026-09-20T17:00:00.000Z",
    })).toThrow("invalid_research_session_duration");
  });
  it("holds a queued session until its configured start without claiming work", async () => {
    const session = baseline();
    const beforeStart = "2026-09-20T17:59:59.999Z";
    expect(decideResearchSession(session, beforeStart)).toEqual({
      action: "idle", reason: "session_not_started",
    });
    expect(decideResearchSession(session, session.startedAt))
      .toMatchObject({ action: "run_one_unit" });
    const claimOne = vi.fn();
    const executor = vi.fn();
    const store: ResearchStore = {
      loadSession: async () => session,
      claimOne,
      settle: vi.fn(), stop: vi.fn(),
    };
    const result = await runResearchSessionTick({
      sessionId: session.id, at: beforeStart, store, executor,
    });
    expect(result).toEqual({ status: "idle", reason: "session_not_started" });
    expect(claimOne).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });
  it("ends the window without claiming the research was completed", () => {
    expect(decideResearchSession(baseline(), baseline().deadlineAt)).toEqual({
      action: "stop", status: "timebox_ended", reason: "session_deadline_reached",
    });
  });
  it("honors cancellation, pause, block and missing authorization", () => {
    expect(decideResearchSession({...baseline(), cancellationRequested: true}, at))
      .toMatchObject({status:"cancelled"});
    expect(decideResearchSession({...baseline(), status:"paused"}, at))
      .toMatchObject({status:"paused"});
    expect(decideResearchSession({...baseline(), status:"blocked"}, at))
      .toMatchObject({status:"blocked"});
    expect(decideResearchSession({...baseline(), authorized:false}, at))
      .toMatchObject({status:"blocked",reason:"authorization_required"});
  });
  it("enforces work/cost budgets; empty queue is not verified complete", () => {
    expect(decideResearchSession({...baseline(), committedCostCents:500}, at))
      .toMatchObject({status:"timebox_ended",reason:"cost_budget_exhausted"});
    expect(decideResearchSession({...baseline(), consumedWorkUnits:60}, at))
      .toMatchObject({status:"timebox_ended",reason:"work_unit_budget_exhausted"});
    expect(decideResearchSession({...baseline(), unresolvedRequiredWork:0}, at))
      .toEqual({action:"idle",reason:"awaiting_completion_verification"});
  });
  it("rejects fabricated evidence-free progress and excess unit costs", () => {
    const receipt = {
      sessionId:"session-1",unitId:"unit-1",idempotencyKey:"session:unit-1",
      status:"completed" as const, recordedAt:at, costCents:2,
      evidenceRefs:[],unresolvedRequiredWork:9,
    };
    expect(() => validateResearchUnitReceipt(baseline(),receipt))
      .toThrow("research_completion_without_evidence");
    expect(() => validateResearchUnitReceipt(baseline(),{...receipt,costCents:426}))
      .toThrow("invalid_unit_cost_cents");
  });
  it("cannot mark progress without evidence by relabeling a receipt", () => {
    const receipt = {
      sessionId: "session-1", unitId: "unit-1", idempotencyKey: "session:unit-1",
      status: "checkpointed" as const, recordedAt: at, costCents: 0,
      evidenceRefs: [], unresolvedRequiredWork: 9,
    };
    for (const status of ["checkpointed", "blocked", "failed", "completed"] as const) {
      expect(() => validateResearchUnitReceipt(baseline(), { ...receipt, status }))
        .toThrow("research_completion_without_evidence");
    }
    expect(() => validateResearchUnitReceipt(baseline(), {
      ...receipt, unresolvedRequiredWork: 10,
    })).not.toThrow();
  });
  it("claims and settles exactly one unit per scheduled invocation", async () => {
    const session = baseline();
    const claim = {
      unitId:"unit-1",leaseToken:"lease-1",
      idempotencyKey:"session:unit-1",kind:"source_fetch",payload:{},
    };
    const receipt = {
      sessionId:session.id,unitId:claim.unitId,idempotencyKey:claim.idempotencyKey,
      status:"completed" as const,recordedAt:at,costCents:3,
      evidenceRefs:["EFTA00212948"],unresolvedRequiredWork:9,
    };
    const store: ResearchStore = {
      loadSession:vi.fn(async()=>session),claimOne:vi.fn(async()=>claim),
      settle:vi.fn(async()=>"committed"),stop:vi.fn(async()=>{}),
    };
    const executor=vi.fn(async()=>receipt);
    const result=await runResearchSessionTick({sessionId:session.id,at,store,executor});
    expect(result.status).toBe("committed");
    expect(executor).toHaveBeenCalledWith(expect.objectContaining({
      remainingMs:1200000,remainingCostCents:425,
    }));
    expect(store.claimOne).toHaveBeenCalledTimes(1);
    expect(store.settle).toHaveBeenCalledTimes(1);
  });
  it("does not claim or execute work once expired", async () => {
    const session=baseline(),claimOne=vi.fn(async()=>null),executor=vi.fn();
    const stop=vi.fn(async()=>{});
    const store:ResearchStore={
      loadSession:async()=>session,claimOne,settle:vi.fn(),stop,
    };
    const result=await runResearchSessionTick({
      sessionId:session.id,at:session.deadlineAt,store,executor,
    });
    expect(result).toEqual({status:"stopped",reason:"session_deadline_reached"});
    expect(claimOne).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledWith(expect.objectContaining({
      status:"timebox_ended",
    }));
  });
  it("rejects mismatched receipts before the store can commit them", async () => {
    const session=baseline(),settle=vi.fn();
    const store:ResearchStore={
      loadSession:async()=>session,
      claimOne:async()=>({
        unitId:"u1",leaseToken:"lease",idempotencyKey:"u1",kind:"fetch",payload:{},
      }),
      settle,stop:vi.fn(),
    };
    await expect(runResearchSessionTick({
      sessionId:session.id,at,store,
      executor:async()=>({
        sessionId:session.id,unitId:"u2",idempotencyKey:"u1",status:"completed",
        recordedAt:at,costCents:0,evidenceRefs:["EFTA00212948"],
        unresolvedRequiredWork:9,
      }),
    })).rejects.toThrow("research_claim_receipt_mismatch");
    expect(settle).not.toHaveBeenCalled();
  });
  it("rejects a receipt above the unit reservation before calling settlement", async () => {
    const session=baseline(),settle=vi.fn();
    const store:ResearchStore={
      loadSession:async()=>session,
      claimOne:async()=>({
        unitId:"u1",leaseToken:"lease",idempotencyKey:"u1",
        kind:"fetch",payload:{},maxCostReservationCents:5,
      }),
      settle,stop:vi.fn(),
    };
    await expect(runResearchSessionTick({
      sessionId:session.id,at,store,
      executor:async({remainingCostCents})=>{
        expect(remainingCostCents).toBe(5);
        return {
          sessionId:session.id,unitId:"u1",idempotencyKey:"u1",
          status:"completed",recordedAt:at,costCents:6,
          evidenceRefs:["EFTA00212948"],unresolvedRequiredWork:9,
        };
      },
    })).rejects.toThrow("research_unit_reservation_exceeded");
    expect(settle).not.toHaveBeenCalled();
  });
});
