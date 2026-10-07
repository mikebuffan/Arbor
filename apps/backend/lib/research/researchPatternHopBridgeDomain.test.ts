import {describe,expect,it} from "vitest";
import {prepareDomainPatternHopCandidates} from "./researchPatternHopBridge";
import type {DomainHopDirective} from "./domainHopPlanner";

describe("domain Pattern Hop bridge",()=>{
  it("preserves trigger provenance and does not execute prepared research hops",()=>{
    const directives:DomainHopDirective[]=[
      {
        hopId:"verify_actual_travel:trip-1",
        kind:"verify_actual_travel",
        query:"trip-1 actual flight movement airport tail log",
        reason:"itinerary_without_actual_movement",
        priority:.95,
        triggerEvidenceRefs:["itinerary-ref","calendar-ref"],
        status:"prepared_not_executed",
      },
    ];
    const candidates=prepareDomainPatternHopCandidates(directives);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].seed.triggerEvidenceRefs).toEqual(["calendar-ref","itinerary-ref"]);
    expect(candidates[0].seed.requestedQuery).toContain("actual flight movement");
    expect(candidates[0].executionRequested).toBe(false);
    expect(candidates[0].status).toBe("prepared_not_submitted");
    expect(candidates[0].persistenceTarget).toBe("arbor_pattern_hop_runs");
  });

  it("rejects duplicate domain hop IDs instead of silently merging them",()=>{
    const directive:DomainHopDirective={
      hopId:"seek_direct_payment_record:p1",
      kind:"seek_direct_payment_record",
      query:"p1 ledger receipt bank transaction",
      reason:"payment_report_without_transaction_record",
      priority:.94,
      triggerEvidenceRefs:["statement-ref"],
      status:"prepared_not_executed",
    };
    expect(()=>prepareDomainPatternHopCandidates([directive,directive])).toThrow("duplicate_domain_pattern_hop_id");
  });
});
