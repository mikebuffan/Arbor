import {describe,expect,it} from "vitest";
import {assessEvidenceIndependence} from "./sourceIndependence";

describe("source independence",()=>{
  it("does not count mirrors, same-origin records, or explicit derivation as independent corroboration",()=>{
    const r=assessEvidenceIndependence([
      {evidenceRef:"a",sourceId:"official",sourceFamilyId:"family-1",derivesFromEvidenceRefs:[]},
      {evidenceRef:"b",sourceId:"mirror",sourceFamilyId:"family-1",derivesFromEvidenceRefs:[]},
      {evidenceRef:"c",sourceId:"article",sourceFamilyId:"family-2",derivesFromEvidenceRefs:["a"]},
      {evidenceRef:"d",sourceId:"separate-record",sourceFamilyId:"family-3",derivesFromEvidenceRefs:[]},
      {evidenceRef:"e",sourceId:"separate-record",sourceFamilyId:"family-4",derivesFromEvidenceRefs:[]},
    ]);
    expect(r.independentGroupCount).toBe(2);
    expect(r.candidateGroupCount).toBe(2);
    expect(r.independenceReviewHold).toBe(false);
    expect(r.status).toBe("independence_not_truth");
  });

  it("holds independence credit when an asserted upstream source is missing from provenance",()=>{
    const r=assessEvidenceIndependence([
      {evidenceRef:"report",sourceId:"article",sourceFamilyId:"article-family",derivesFromEvidenceRefs:["missing-police-report"]},
      {evidenceRef:"record",sourceId:"separate-record",sourceFamilyId:"record-family",derivesFromEvidenceRefs:[]},
    ]);
    expect(r.candidateGroupCount).toBe(2);
    expect(r.independentGroupCount).toBe(1);
    expect(r.unresolvedDerivationRefs).toEqual(["missing-police-report"]);
    expect(r.independenceReviewHold).toBe(true);
  });

  it("rejects self-derivation instead of silently treating it as provenance",()=>{
    expect(()=>assessEvidenceIndependence([
      {evidenceRef:"a",sourceId:"s",sourceFamilyId:"f",derivesFromEvidenceRefs:["a"]},
    ])).toThrow("self_derivation_independence_evidence_ref");
  });
});
