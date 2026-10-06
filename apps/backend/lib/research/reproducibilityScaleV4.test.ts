import { describe, expect, it } from "vitest";
import { createInvestigationReplayReceipt, verifyReplayRecipe } from "./investigationReplayReceipt";
import { buildEvidencePacket, packetReleaseReadiness } from "./evidencePacketBuilder";
import { createMultilingualEvidenceRecord } from "./multilingualEvidence";
import { decideBackpressure, planCorpusShards } from "./corpusBackpressure";
import { decideCoverageAwareStopping } from "./coverageAwareStopping";

describe("reproducibility and scale v4",()=>{
  it("creates deterministic replay receipts from canonical recipe content",async()=>{
    const a=await createInvestigationReplayReceipt({
      recipeId:"recipe-1",
      corpusSnapshotRefs:["snapshot-b","snapshot-a"],
      queryText:"synthetic aircraft schedule",
      filters:{year:2004,tail:"N550MS",reviewed:true},
      hopDirectives:["calendar","travel"],
      resolverDecisions:[{resolver:"identity-gate-v1",subjectRef:"candidate-1",decision:"ambiguous",evidenceRefs:["m2","m1"]}],
      codeVersion:"git:abc123",
      algorithmVersions:{retrieval:"v2",timeline:"v1"},
      producedEvidenceRefs:["e2","e1"],producedLeadRefs:["l1"],
    });
    const b=await createInvestigationReplayReceipt({
      recipeId:"recipe-1",
      corpusSnapshotRefs:["snapshot-a","snapshot-b"],
      queryText:"synthetic aircraft schedule",
      filters:{reviewed:true,tail:"N550MS",year:2004},
      hopDirectives:["travel","calendar"],
      resolverDecisions:[{resolver:"identity-gate-v1",subjectRef:"candidate-1",decision:"ambiguous",evidenceRefs:["m1","m2"]}],
      codeVersion:"git:abc123",
      algorithmVersions:{timeline:"v1",retrieval:"v2"},
      producedEvidenceRefs:["e1","e2"],producedLeadRefs:["l1"],
    });
    expect(a.recipeSha256).toBe(b.recipeSha256);
    expect(await verifyReplayRecipe(a)).toBe(true);
    expect(a.status).toBe("replayable_recipe_not_finding");
  });

  it("builds HOLD evidence packets with counterevidence and unresolved limitations preserved",()=>{
    const packet=buildEvidencePacket({
      packetId:"packet-1",findingRef:"finding-1",title:"Synthetic finding packet",replayRecipeSha256:"a".repeat(64),
      sources:[
        {evidenceRef:"e1",sourceRef:"page:1",documentId:"doc",physicalPage:1,originalBytesSha256:"b".repeat(64),
          pageHash:"c".repeat(64),highlightedText:"Synthetic supporting text.",role:"support"},
        {evidenceRef:"e2",sourceRef:"page:2",documentId:"doc",physicalPage:2,originalBytesSha256:"b".repeat(64),
          pageHash:"d".repeat(64),highlightedText:"Synthetic counterevidence text.",role:"counterevidence"},
      ],
      limitations:["Synthetic-only acceptance"],unresolvedQuestions:["Need independent source"],privacyFlagIds:[],
      originalPageReviewComplete:true,status:"hold_for_human_evidence_packet_review",
    });
    const readiness=packetReleaseReadiness(packet);
    expect(packet.status).toMatch(/^hold_/);
    expect(readiness.readyForHumanReleaseDecision).toBe(false);
    expect(readiness.holdReasons).toContain("unresolved_questions_present");
  });

  it("preserves original multilingual text and validates aligned translation spans",()=>{
    const original="Hola mundo. Adiós.";
    const record=createMultilingualEvidenceRecord({
      recordId:"tr-1",documentId:"doc-1",sourceLanguage:"es",originalText:original,
      segments:[
        {segmentId:"s1",sourceText:"Hola mundo.",translatedText:"Hello world.",sourceLanguage:"es",targetLanguage:"en",
          sourceRef:"page:1:0-11",sourceStartUtf16:0,sourceEndUtf16:11,translator:"synthetic-translator",
          translatorVersion:"1",machineConfidence:.8,ambiguityNotes:[],humanReviewStatus:"unreviewed"},
        {segmentId:"s2",sourceText:"Adiós.",translatedText:"Goodbye.",sourceLanguage:"es",targetLanguage:"en",
          sourceRef:"page:1:12-18",sourceStartUtf16:12,sourceEndUtf16:18,translator:"human",
          translatorVersion:null,machineConfidence:null,ambiguityNotes:["accent preserved"],humanReviewStatus:"reviewed"},
      ],status:"original_preserved_translation_secondary",
    });
    expect(record.originalText).toBe(original);
    expect(record.segments[0].translatedText).toBe("Hello world.");
    expect(record.status).toBe("original_preserved_translation_secondary");
  });

  it("plans a 3.5M-page corpus deterministically and backs off under pressure",()=>{
    const shards=planCorpusShards(3_500_000,5000);
    expect(shards).toHaveLength(700);
    expect(shards[0]).toMatchObject({firstPage:1,lastPage:5000,pageCount:5000});
    expect(shards[699]).toMatchObject({firstPage:3_495_001,lastPage:3_500_000,pageCount:5000});
    expect(decideBackpressure({
      currentConcurrency:8,currentBatchPages:128,maxConcurrency:16,maxBatchPages:256,
      queueDepth:100,p95LatencyMs:25000,errorRate:.12,memoryUtilization:.93,storageBudgetRemainingRatio:.5,
    }).action).toBe("decrease");
    expect(decideBackpressure({
      currentConcurrency:4,currentBatchPages:64,maxConcurrency:16,maxBatchPages:256,
      queueDepth:100,p95LatencyMs:2000,errorRate:.01,memoryUtilization:.5,storageBudgetRemainingRatio:.8,
    }).action).toBe("increase");
  });

  it("stops only after coverage, exhaustion, stability and completion evidence; otherwise holds/continues",()=>{
    expect(decideCoverageAwareStopping({
      sourceFamiliesExhausted:true,unresolvedContradictionCount:0,unresolvedIdentityCount:0,unresolvedRequiredWork:0,
      coverageRatios:[.95,.8,1],roundsWithoutNewEvidence:3,roundsWithoutNewLeads:3,minimumStableRounds:3,
      completionEvidenceRefs:["receipt:a","receipt:b"],
    }).action).toBe("stop_exhausted");
    expect(decideCoverageAwareStopping({
      sourceFamiliesExhausted:true,unresolvedContradictionCount:1,unresolvedIdentityCount:0,unresolvedRequiredWork:0,
      coverageRatios:[1],roundsWithoutNewEvidence:3,roundsWithoutNewLeads:3,minimumStableRounds:3,
      completionEvidenceRefs:["receipt:a"],
    }).action).toBe("hold_for_manual_review");
    expect(decideCoverageAwareStopping({
      sourceFamiliesExhausted:false,unresolvedContradictionCount:0,unresolvedIdentityCount:0,unresolvedRequiredWork:1,
      coverageRatios:[.5],roundsWithoutNewEvidence:1,roundsWithoutNewLeads:1,minimumStableRounds:3,
      completionEvidenceRefs:[],
    }).action).toBe("continue");
  });
});
