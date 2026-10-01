import { describe, expect, it } from "vitest";
import { compareReleaseSnapshots, createExpectedRecordLead, redactionGeometrySimilarity } from "./releaseDelta";

const A="a".repeat(64),B="b".repeat(64),C="c".repeat(64);
const box={x:10,y:10,width:20,height:8,pageWidth:100,pageHeight:100};

describe("release delta",()=>{
  it("finds page, text, attachment, bates and redaction changes",()=>{
    const prior={releaseId:"r1",publishedAtUtc:"2026-01-01T00:00:00.000Z",pages:[
      {pageId:"p1",physicalPage:1,batesNumber:100,exactSha256:A,normalizedTextSha256:A,redactions:[box],attachmentRefs:[]},
      {pageId:"p2",physicalPage:2,batesNumber:101,exactSha256:B,normalizedTextSha256:B,redactions:[],attachmentRefs:["att-old"]},
    ]};
    const current={releaseId:"r2",publishedAtUtc:"2026-02-01T00:00:00.000Z",pages:[
      {pageId:"p1",physicalPage:1,batesNumber:100,exactSha256:A,normalizedTextSha256:C,redactions:[],attachmentRefs:["att-new"]},
      {pageId:"p3",physicalPage:2,batesNumber:102,exactSha256:C,normalizedTextSha256:C,redactions:[],attachmentRefs:[]},
    ]};
    const delta=compareReleaseSnapshots(prior,current);
    expect(delta.addedPageIds).toEqual(["p3"]);
    expect(delta.removedPageIds).toEqual(["p2"]);
    expect(delta.changedPageIds).toEqual(["p1"]);
    expect(delta.newlyReferencedAttachmentIds).toEqual(["att-new"]);
    expect(delta.missingBatesNumbers).toEqual([101]);
    expect(delta.redactionChanges[0]).toMatchObject({pageId:"p1",priorCount:1,currentCount:0});
  });

  it("keeps geometry matching as a score, not an identity resolution",()=>{
    expect(redactionGeometrySimilarity([box],[box])).toBe(1);
    expect(redactionGeometrySimilarity([box],[])).toBe(0);
  });

  it("encodes missing expected records only as leads backed by evidence",()=>{
    const lead=createExpectedRecordLead({
      leadId:"lead-1",expectationReason:"synthetic email explicitly says attached itinerary",
      expectedRecordKind:"attachment",supportingEvidenceRefs:["page:1"],observedStatus:"not_observed_in_current_corpus",
    });
    expect(lead.observedStatus).toBe("not_observed_in_current_corpus");
    expect(()=>createExpectedRecordLead({...lead,supportingEvidenceRefs:[]})).toThrow("expected_record_requires_support");
  });
});
