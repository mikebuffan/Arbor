import { describe, expect, it, vi } from "vitest";
import { agencyYieldDecision, runAgency, type AgencyRuntime, type AgencyState } from "@/lib/arbor/agency/engine";

describe("resumable agency engine", () => {
  it("restores a matching active checkpoint instead of starting empty", async () => {
    const persisted: AgencyState[] = [];
    const runtime: AgencyRuntime<{done:boolean}> = {
      loadSharedState: async () => ({done:false}),
      loadAgencyState: async () => ({goal:"finish",status:"active",currentStep:7,unresolvedWork:["last step"],recurringWeaknesses:[],strategyNotes:[],blocker:null}),
      assess: async ({agency}) => ({complete: agency.currentStep >= 7, unresolvedWork: agency.unresolvedWork}),
      choose: async () => ({id:"noop",description:"noop",reversible:true}),
      execute: async () => null,
      integrate: async ({shared}) => shared,
      verify: async () => ({ok:true}),
      selfAudit: async () => ({}),
      persist: async ({agency}) => { persisted.push(agency); },
    };
    const out = await runAgency({goal:"finish",runtime});
    expect(out.agency.status).toBe("complete");
    expect(persisted.at(-1)?.status).toBe("complete");
  });


  it("resumes a durable checkpoint after its last executed step instead of replaying from zero", async () => {
    const assessedSteps: number[] = [];
    let executed = 0;
    const runtime: AgencyRuntime<{}> = {
      loadSharedState: async () => ({}),
      loadAgencyState: async () => ({
        goal: "finish",
        status: "checkpointed",
        currentStep: 7,
        unresolvedWork: ["verify resumed step"],
        recurringWeaknesses: [],
        strategyNotes: [],
        blocker: null,
      }),
      assess: async ({agency}) => {
        assessedSteps.push(agency.currentStep);
        return {complete: agency.currentStep >= 8, unresolvedWork: []};
      },
      choose: async () => ({id:"should-not-replay",description:"should not replay",reversible:true}),
      execute: async () => { executed += 1; return null; },
      integrate: async ({shared}) => shared,
      verify: async () => ({ok:true}),
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const out = await runAgency({goal:"finish",runtime,maxSteps:1});
    expect(assessedSteps).toEqual([8]);
    expect(executed).toBe(0);
    expect(out.agency.status).toBe("complete");
  });

  it("tries a safe alternate before yielding on a blocked action", async () => {
    let executed = "";
    const runtime: AgencyRuntime<{}> = {
      loadSharedState: async () => ({}),
      assess: async ({agency}) => ({complete: agency.currentStep > 0, unresolvedWork:["do work"]}),
      choose: async () => ({id:"locked",description:"locked route",reversible:true,requiresExternalAuthority:true}),
      recover: async () => ({id:"alternate",description:"safe alternate",reversible:true}),
      execute: async ({action}) => { executed=action.id; return "ok"; },
      integrate: async ({shared}) => shared,
      verify: async () => ({ok:true}),
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const out=await runAgency({goal:"finish",runtime,maxSteps:2});
    expect(executed).toBe("alternate");
    expect(out.agency.status).toBe("complete");
  });

  it("requires completion proof when a prover is supplied", async () => {
    let proofCalls=0;
    const runtime: AgencyRuntime<{}> = {
      loadSharedState: async () => ({}),
      assess: async ({agency}) => ({complete:true, unresolvedWork:agency.unresolvedWork}),
      proveComplete: async () => ({ok: ++proofCalls > 1, correction:"need evidence"}),
      choose: async () => ({id:"verify",description:"collect evidence",reversible:true}),
      execute: async () => "evidence",
      integrate: async ({shared}) => shared,
      verify: async () => ({ok:true}),
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const out=await runAgency({goal:"finish",runtime,maxSteps:3});
    expect(proofCalls).toBeGreaterThan(1);
    expect(out.agency.status).toBe("complete");
  });

  it("checkpoints instead of throwing when the step budget ends", async () => {
    const runtime: AgencyRuntime<{}> = {
      loadSharedState: async () => ({}),
      assess: async () => ({complete:false, unresolvedWork:["still working"]}),
      choose: async () => ({id:"step",description:"step",reversible:true}),
      execute: async () => null,
      integrate: async ({shared}) => shared,
      verify: async () => ({ok:true}),
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const out=await runAgency({goal:"finish",runtime,maxSteps:1});
    expect(out.agency.status).toBe("checkpointed");
    expect(agencyYieldDecision(out.agency)).toEqual({yield:false,reason:"checkpointed"});
  });
  it("keeps restored protected blockers intact without assessment, writes or execution", async () => {
    for (const blocker of [
      "external_authority", "irreversible_action", "missing_preference",
      "high_consequence_fork", null,
    ] as const) {
      const prior: AgencyState = {
        goal: "finish protected work", status: "blocked", currentStep: 9,
        unresolvedWork: ["protected action"], recurringWeaknesses: [],
        strategyNotes: [], blocker,
      };
      const assess = vi.fn(async () => ({ complete: false, unresolvedWork: ["protected action"] }));
      const choose = vi.fn(async () => ({ id: "unsafe", description: "unsafe", reversible: true }));
      const execute = vi.fn(async () => "should not execute");
      const persist = vi.fn(async () => {});
      const runtime: AgencyRuntime<{ completed: number }> = {
        loadSharedState: async () => ({ completed: 0 }),
        loadAgencyState: async () => prior,
        assess, choose, execute,
        integrate: async ({ shared }) => shared,
        verify: async () => ({ ok: true }),
        selfAudit: async () => ({}),
        persist,
      };
      const result = await runAgency({ goal: prior.goal, runtime, maxSteps: 5 });
      expect(result.agency).toEqual(prior);
      expect(result.shared).toEqual({ completed: 0 });
      expect(assess).not.toHaveBeenCalled();
      expect(choose).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
      expect(persist).not.toHaveBeenCalled();
    }
  });

  it("does not replay a recorded complete objective with no unfinished work", async () => {
    const prior: AgencyState = {
      goal: "complete existing objective", status: "complete", currentStep: 12,
      unresolvedWork: [], recurringWeaknesses: [], strategyNotes: [],
      blocker: null, lastVerification: { ok: true, evidence: "receipt" },
    };
    const assess = vi.fn(async () => ({ complete: false, unresolvedWork: ["new step"] }));
    const choose = vi.fn(async () => ({ id: "duplicate", description: "duplicate", reversible: true }));
    const execute = vi.fn(async () => 1);
    const persist = vi.fn(async () => {});
    const runtime: AgencyRuntime<{ completed: number }> = {
      loadSharedState: async () => ({ completed: 1 }),
      loadAgencyState: async () => prior,
      assess, choose, execute,
      integrate: async ({ shared }) => shared,
      verify: async () => ({ ok: true }),
      selfAudit: async () => ({}), persist,
    };
    const result = await runAgency({ goal: prior.goal, runtime });
    expect(result.agency).toEqual(prior);
    expect(assess).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("still executes separately requested fresh work when an old goal is blocked", async () => {
    const execute = vi.fn(async () => 1);
    const runtime: AgencyRuntime<{ completed: number }> = {
      loadSharedState: async () => ({ completed: 0 }),
      loadAgencyState: async () => ({
        goal: "old protected goal", status: "blocked", currentStep: 15,
        unresolvedWork: ["requires consent"], recurringWeaknesses: [],
        strategyNotes: [], blocker: "external_authority",
      }),
      assess: async ({ shared }) => ({
        complete: shared.completed === 1,
        unresolvedWork: shared.completed ? [] : ["safe separate task"],
      }),
      choose: async () => ({ id: "safe-new", description: "safe new task", reversible: true }),
      execute,
      integrate: async ({ shared, result }) => ({ completed: shared.completed + Number(result) }),
      verify: async () => ({ ok: true }),
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const result = await runAgency({ goal: "separate safe goal", runtime, maxSteps: 3 });
    expect(result.agency.status).toBe("complete");
    expect(result.agency.goal).toBe("separate safe goal");
    expect(execute).toHaveBeenCalledOnce();
    expect(result.shared.completed).toBe(1);
  });

  it.each([NaN, Infinity, -Infinity, 0, -1, 1.5, 257])(
    "rejects invalid agency step budget %s before any state access", async maxSteps => {
      const loadSharedState = vi.fn(async () => ({}));
      const runtime: AgencyRuntime<{}> = {
        loadSharedState,
        assess: async () => ({ complete: false, unresolvedWork: ["work"] }),
        choose: async () => ({ id: "x", description: "x", reversible: true }),
        execute: async () => null,
        integrate: async ({ shared }) => shared,
        verify: async () => ({ ok: true }),
        selfAudit: async () => ({}),
        persist: async () => {},
      };
      await expect(runAgency({ goal: "bounded task", runtime, maxSteps }))
        .rejects.toThrow("agency_invalid_step_budget");
      expect(loadSharedState).not.toHaveBeenCalled();
    },
  );

  it("does not turn a failed action verification into unproven completion", async () => {
    const executed = vi.fn(async () => 1);
    const persist = vi.fn(async () => {});
    const proveOnlyByAction = vi.fn(async () => ({ ok: false, correction: "receipt missing" }));
    const runtime: AgencyRuntime<{ done: number }> = {
      loadSharedState: async () => ({ done: 0 }),
      assess: async ({ shared }) => ({
        complete: shared.done > 0,
        unresolvedWork: shared.done ? [] : ["write one item"],
      }),
      choose: async () => ({ id: "one", description: "write item", reversible: true }),
      execute: executed,
      integrate: async ({ shared, result }) => ({ done: shared.done + Number(result) }),
      verify: proveOnlyByAction,
      selfAudit: async () => ({}),
      persist,
    };
    const out = await runAgency({ goal: "finish safely", runtime, maxSteps: 5 });
    expect(out.agency.status).toBe("checkpointed");
    expect(out.agency.lastVerification?.ok).toBe(false);
    expect(out.agency.unresolvedWork).toContain("receipt missing");
    expect(executed).toHaveBeenCalledOnce();
    expect(proveOnlyByAction).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenLastCalledWith(expect.objectContaining({ agency: expect.objectContaining({ status: "checkpointed" }) }));
  });

  it("permits genuine independent completion proof to recover a prior failed verification", async () => {
    let calls = 0;
    const completeProof = vi.fn(async () => ({ ok: true, evidence: "verified readback" }));
    const runtime: AgencyRuntime<{ done: number }> = {
      loadSharedState: async () => ({ done: 0 }),
      assess: async ({ shared }) => ({
        complete: shared.done >= 1,
        unresolvedWork: shared.done ? [] : ["run reversible step"],
      }),
      choose: async () => ({ id: "safe", description: "safe step", reversible: true }),
      execute: async () => { calls++; return 1; },
      integrate: async ({ shared, result }) => ({ done: shared.done + Number(result) }),
      verify: async () => ({ ok: false, correction: "need source receipt" }),
      proveComplete: completeProof,
      selfAudit: async () => ({}),
      persist: async () => {},
    };
    const out = await runAgency({ goal: "verify with receipts", runtime, maxSteps: 4 });
    expect(out.agency.status).toBe("complete");
    expect(out.agency.lastVerification).toEqual({ ok: true, evidence: "verified readback" });
    expect(completeProof).toHaveBeenCalledOnce();
    expect(calls).toBe(1);
  });

  it("retains a restored checkpoint with an unresolved negative verification", async () => {
    const executed = vi.fn(async () => "unsafe replay");
    const persist = vi.fn(async () => {});
    const runtime: AgencyRuntime<{}> = {
      loadSharedState: async () => ({}),
      loadAgencyState: async () => ({
        goal: "existing goal", status: "checkpointed", currentStep: 8,
        unresolvedWork: ["missing receipt"], recurringWeaknesses: [], strategyNotes: [],
        blocker: null, lastVerification: { ok: false, correction: "missing receipt" },
      }),
      assess: async () => ({ complete: true, unresolvedWork: [] }),
      choose: async () => ({ id: "repeat", description: "repeat", reversible: true }),
      execute: executed,
      integrate: async ({ shared }) => shared,
      verify: async () => ({ ok: true }),
      selfAudit: async () => ({}),
      persist,
    };
    const out = await runAgency({ goal: "existing goal", runtime, maxSteps: 4 });
    expect(out.agency.status).toBe("checkpointed");
    expect(out.agency.currentStep).toBe(9);
    expect(out.agency.unresolvedWork).toContain("missing receipt");
    expect(executed).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledOnce();
  });

  it("reconciles a contradictory stored complete/failed-verification state without replay", async () => {
    const execute = vi.fn(async () => 1);
    const assess = vi.fn(async () => ({ complete: true, unresolvedWork: [] }));
    const persist = vi.fn(async () => {});
    const runtime: AgencyRuntime<{ done: number }> = {
      loadSharedState: async () => ({ done: 1 }),
      loadAgencyState: async () => ({
        goal: "historical result", status: "complete", currentStep: 4,
        unresolvedWork: [], recurringWeaknesses: [], strategyNotes: [],
        lastVerification: { ok: false, correction: "source receipt missing" },
      }),
      assess,
      choose: async () => ({ id: "repeat", description: "duplicate write", reversible: true }),
      execute,
      integrate: async ({ shared }) => shared,
      verify: async () => ({ ok: true }),
      selfAudit: async () => ({}),
      persist,
    };
    const result = await runAgency({ goal: "historical result", runtime });
    expect(result.agency.status).toBe("checkpointed");
    expect(result.agency.lastVerification?.ok).toBe(false);
    expect(result.agency.unresolvedWork).toEqual(["source receipt missing"]);
    expect(result.agency.currentStep).toBe(4);
    expect(assess).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledOnce();
  });

});
