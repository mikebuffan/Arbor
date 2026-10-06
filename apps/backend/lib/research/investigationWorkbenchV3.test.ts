import { describe, expect, it } from "vitest";
import { reconstructThreads } from "./threadReconstruction";
import { assertNoBiometricInference, createLiteralVisualObservation, createVisualEvidenceAsset } from "./imageExhibitEvidence";
import { buildResearchCoverageMap } from "./researchCoverageMap";
import { leadPrioritizerAcceptedFields, prioritizeResearchLeads } from "./leadPrioritizer";
import { recordReviewAction, reviewPacketStats, type ReviewPacket } from "./reviewWorkbench";

describe("investigation workbench v3",()=>{
  it("reconstructs explicit reply/forward threads and preserves orphan references",()=>{
    const threads=reconstructThreads([
      {documentId:"d1",messageId:"m1",sentAtUtc:"2020-01-01T10:00:00Z",senderEntityId:"A",recipientEntityIds:["B"],
        inReplyToMessageId:null,forwardedMessageIds:[],sourceRefs:["p1"]},
      {documentId:"d2",messageId:"m2",sentAtUtc:"2020-01-01T11:00:00Z",senderEntityId:"B",recipientEntityIds:["A"],
        inReplyToMessageId:"m1",forwardedMessageIds:[],sourceRefs:["p2"]},
      {documentId:"d3",messageId:"m3",sentAtUtc:"2020-01-01T12:00:00Z",senderEntityId:"C",recipientEntityIds:["D"],
        inReplyToMessageId:null,forwardedMessageIds:["missing-message"],sourceRefs:["p3"]},
    ]);
    expect(threads.some(t=>t.documentIds.join(",")==="d1,d2")).toBe(true);
    expect(threads.find(t=>t.documentIds.includes("d3"))?.orphanReferenceIds).toEqual(["missing-message"]);
  });

  it("records visual exhibits as source-bound assets and blocks identity inference language",()=>{
    const asset=createVisualEvidenceAsset({
      assetId:"v1",kind:"photograph",documentId:"doc",physicalPage:2,
      originalBytesSha256:"a".repeat(64),imageBytesSha256:"b".repeat(64),
      sourceRefs:["page:2"],exhibitLabel:"Exhibit A",captionText:"Synthetic caption",
      createdAtUtc:"2020-01-01T00:00:00Z",linkedTestimonyRefs:["testimony:1"],
      reviewStatus:"hold_for_visual_source_and_privacy_review",
    });
    expect(asset.reviewStatus).toMatch(/^hold_/);
    const literal=createLiteralVisualObservation({
      observationId:"o1",assetId:"v1",literalObservation:"A vehicle is visible in the lower-left quadrant.",
      sourceRegion:{x:1,y:2,width:3,height:4},reviewerRef:"reviewer",observedAtUtc:"2026-10-01T20:00:00Z",
      status:"literal_visual_observation_only",
    });
    expect(()=>assertNoBiometricInference(literal)).not.toThrow();
    expect(()=>assertNoBiometricInference({...literal,literalObservation:"The face match appears to be the same person."}))
      .toThrow("visual_identity_inference_not_allowed");
  });

  it("maps coverage without converting coverage into truth",()=>{
    const map=buildResearchCoverageMap([
      {dimension:"document_family",key:"flight_manifests",expectedCount:4,
        observedUniqueSourceRefs:["a","b","c","d"],processedUniqueSourceRefs:["a","b","c"]},
      {dimension:"record_type",key:"payments",expectedCount:null,
        observedUniqueSourceRefs:["p1","p2"],processedUniqueSourceRefs:[]},
    ]);
    expect(map.status).toBe("coverage_not_truth");
    expect(map.buckets.find(b=>b.key==="flight_manifests")?.coverageRatio).toBe(.75);
    expect(map.blindSpots.some(b=>b.key==="payments")).toBe(true);
  });

  it("prioritizes research value, not people or guilt",()=>{
    const ranked=prioritizeResearchLeads([
      {leadId:"cheap-high-info",triggerEvidenceRefs:["e1"],contradictionCount:4,independentSourcePotential:.8,
        unresolvedIdentityCount:1,missingConnectivityCount:3,expectedInformationGain:.9,evidenceDensity:.7,estimatedCostUnits:2},
      {leadId:"expensive-low-info",triggerEvidenceRefs:["e2"],contradictionCount:0,independentSourcePotential:.1,
        unresolvedIdentityCount:0,missingConnectivityCount:0,expectedInformationGain:.2,evidenceDensity:.2,estimatedCostUnits:100},
    ]);
    expect(ranked[0].leadId).toBe("cheap-high-info");
    expect(ranked.every(x=>x.status==="research_value_only")).toBe(true);
    expect(leadPrioritizerAcceptedFields().join(" ")).not.toMatch(/guilt|suspicion|criminal|person/i);
  });

  it("creates append-only-style review action receipts without changing the packet",()=>{
    const packet:ReviewPacket={
      packetId:"rp1",title:"Synthetic packet",
      source:{documentId:"doc",physicalPage:1,originalBytesSha256:"a".repeat(64),pageHash:"b".repeat(64),sourceRefs:["p1"]},
      extractedText:"Synthetic source text",ocr:null,tableCandidates:[],
      identityCandidates:[{candidateId:"c1",label:"J. Example",status:"ambiguous",basisMentionIds:["m1"]}],
      contradictions:[],releaseVariants:[],visualAssets:[],privacyFlagIds:[],publicationStatus:"hold",
    };
    const before=JSON.stringify(packet);
    const receipt=recordReviewAction({packet,receiptId:"rr1",action:"hold_identity",targetRef:"c1",
      reviewerRef:"human",rationale:"Identity remains ambiguous in the source record.",evidenceRefs:["m1"],
      createdAtUtc:"2026-10-01T20:05:00Z"});
    expect(receipt.status).toBe("recorded_no_source_mutation");
    expect(JSON.stringify(packet)).toBe(before);
    expect(reviewPacketStats(packet).unresolvedIdentities).toBe(1);
  });
});
