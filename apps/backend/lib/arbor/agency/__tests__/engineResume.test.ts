import { describe, expect, it } from "vitest";
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
});
