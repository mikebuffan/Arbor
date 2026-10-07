import {describe,expect,it} from "vitest";
import {assessTravelVerification} from "./travelVerification";
import {assessPaymentChains} from "./paymentChain";
import {crossCheckWitnessClaims} from "./witnessCrossCheck";
import {propagateContradictionEffects} from "./contradictionPropagation";
import {buildEvidenceCoverageMatrix} from "./evidenceCoverageMatrix";
import {rankSourcePreference} from "./sourcePreference";

describe("research hop domain lenses",()=>{
  it("keeps an itinerary separate from actual movement and traveler presence",()=>{
    const planned=assessTravelVerification([{evidenceRef:"itinerary",sourceFamilyId:"police-family",tripRef:"trip-1",kind:"itinerary",origin:"PBI",destination:"TEB",departedAtUtc:"2005-04-05T20:00:00Z",arrivedAtUtc:"2005-04-05T22:15:00Z",travelerIds:[]}]);
    expect(planned[0].status).toBe("planned_only");
    expect(planned[0].actualMovementRefs).toEqual([]);
    const confirmed=assessTravelVerification([
      {evidenceRef:"itinerary",sourceFamilyId:"police-family",tripRef:"trip-1",kind:"itinerary",origin:"PBI",destination:"TEB",departedAtUtc:"2005-04-05T20:00:00Z",arrivedAtUtc:"2005-04-05T22:15:00Z",travelerIds:[]},
      {evidenceRef:"movement",sourceFamilyId:"aviation-family",tripRef:"trip-1",kind:"flight_movement",origin:"PBI",destination:"TEB",departedAtUtc:"2005-04-05T20:04:00Z",arrivedAtUtc:"2005-04-05T22:10:00Z",travelerIds:[]},
      {evidenceRef:"manifest",sourceFamilyId:"manifest-family",tripRef:"trip-1",kind:"manifest",origin:"PBI",destination:"TEB",departedAtUtc:"2005-04-05T20:04:00Z",arrivedAtUtc:"2005-04-05T22:10:00Z",travelerIds:["person-1"]},
    ]);
    expect(confirmed[0].status).toBe("traveler_presence_supported");
    expect(confirmed[0].travelerSupport[0].travelerId).toBe("person-1");
  });

  it("does not turn cash availability or a witness report into a verified payment",()=>{
    const cash=assessPaymentChains([
      {evidenceRef:"w1",sourceFamilyId:"witness-family",paymentRef:"p1",kind:"witness_report",amount:200,currency:"USD",payerEntityId:null,payeeEntityId:null},
      {evidenceRef:"atm",sourceFamilyId:"bank-family",paymentRef:"p1",kind:"atm_withdrawal",amount:200,currency:"USD",payerEntityId:"account-1",payeeEntityId:null},
    ]);
    expect(cash[0].status).toBe("cash_availability_only");
    expect(cash[0].note).toBe("cash_withdrawal_does_not_prove_payment");
    const linked=assessPaymentChains([
      {evidenceRef:"txn",sourceFamilyId:"ledger-family",paymentRef:"p2",kind:"ledger",amount:200,currency:"USD",payerEntityId:"person-a",payeeEntityId:"person-b"},
    ]);
    expect(linked[0].status).toBe("direct_linked_payment_record");
  });

  it("cross-checks witness claims without producing a credibility verdict",()=>{
    const result=crossCheckWitnessClaims(
      [{claimId:"c1",witnessId:"w1",topicKey:"appointment",evidenceRefs:["statement"]}],
      [
        {recordId:"r1",claimId:"c1",kind:"phone",sourceFamilyId:"phone-family",evidenceRefs:["phone"],relation:"supports",independentOfWitnessSource:true},
        {recordId:"r2",claimId:"c1",kind:"calendar",sourceFamilyId:"calendar-family",evidenceRefs:["calendar"],relation:"contradicts",independentOfWitnessSource:true},
      ],
    );
    expect(result[0].independentSupportFamilies).toEqual(["phone-family"]);
    expect(result[0].independentCounterFamilies).toEqual(["calendar-family"]);
    expect(result[0].status).toBe("cross_check_not_credibility_verdict");
  });

  it("propagates a weakened premise into downstream confidence without changing source evidence",()=>{
    const result=propagateContradictionEffects(
      [{claimId:"a",baseConfidence:1,evidenceRefs:["a-src"]},{claimId:"b",baseConfidence:.8,evidenceRefs:["b-src"]}],
      [{upstreamClaimId:"a",downstreamClaimId:"b",weight:1}],
      [{claimId:"a",severity:.5,evidenceRefs:["counter-a"]}],
    );
    expect(result.find(x=>x.claimId==="a")?.adjustedConfidence).toBe(.5);
    expect(result.find(x=>x.claimId==="b")?.adjustedConfidence).toBeCloseTo(.4);
    expect(result.find(x=>x.claimId==="b")?.propagatedFrom).toEqual(["a"]);
  });

  it("shows event-level channel holes explicitly",()=>{
    const result=buildEvidenceCoverageMatrix([
      {eventKey:"2005-04-05",channel:"messages",observedRefs:["m1"],checkedRefs:["m1"]},
      {eventKey:"2005-04-05",channel:"travel",observedRefs:["t1","t2"],checkedRefs:["t1"]},
      {eventKey:"2005-04-05",channel:"payment",observedRefs:["p1"],checkedRefs:[]},
    ]);
    expect(result[0].channels.messages).toBe("checked");
    expect(result[0].channels.travel).toBe("partial");
    expect(result[0].channels.payment).toBe("unchecked");
    expect(result[0].channels.phone).toBe("not_observed");
  });

  it("prefers originals while keeping summaries usable with explicit provenance",()=>{
    const result=rankSourcePreference([
      {evidenceRef:"summary",sourceFamilyId:"family-a",layer:"official_summary",originalAvailable:false},
      {evidenceRef:"original",sourceFamilyId:"family-a",layer:"original_record",originalAvailable:true},
    ]);
    expect(result.map(x=>x.evidenceRef)).toEqual(["original","summary"]);
    expect(result[1].reviewAction).toBe("seek_original");
    expect(result[0].status).toBe("preference_not_truth");
  });
});
