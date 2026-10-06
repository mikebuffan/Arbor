import {describe,expect,it} from "vitest";import {assessEvidenceIndependence} from "./sourceIndependence";
describe("source independence",()=>{it("does not count mirrors or explicit derivation as independent corroboration",()=>{const r=assessEvidenceIndependence([
{evidenceRef:"a",sourceId:"official",sourceFamilyId:"family-1",derivesFromEvidenceRefs:[]},
{evidenceRef:"b",sourceId:"mirror",sourceFamilyId:"family-1",derivesFromEvidenceRefs:[]},
{evidenceRef:"c",sourceId:"article",sourceFamilyId:"family-2",derivesFromEvidenceRefs:["a"]},
{evidenceRef:"d",sourceId:"separate-record",sourceFamilyId:"family-3",derivesFromEvidenceRefs:[]}]);expect(r.independentGroupCount).toBe(2);expect(r.status).toBe("independence_not_truth");});});