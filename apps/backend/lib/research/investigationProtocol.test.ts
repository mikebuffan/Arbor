import { describe, expect, it } from "vitest";
import { runInvestigationResearchPass } from "./investigationProtocol";

describe("investigation research pass",()=>{
  it("produces a bounded source-first pass without starting work or promoting findings",()=>{
    const out=runInvestigationResearchPass({
      passId:"pass-1",documentId:"doc-1",filename:"synthetic-deposition.txt",
      text:"DEPOSITION\nQ: Contact A@EXAMPLE.ORG about N550MS on January 2, 2004.\nA: I do not recall.",
      mentions:[{
        mentionId:"m1",pageHash:"a".repeat(64),documentId:"doc-1",physicalPage:1,
        lineStart:2,lineEnd:2,startUtf16:22,endUtf16:35,rawText:"A@EXAMPLE.ORG",
        normalizedText:"A@EXAMPLE.ORG",extractionMethod:"regex",extractionConfidence:1,entityCandidateId:null,
      }],
      edges:[],
      timeline:[],
      transcriptTurns:[
        {turnId:"1",topicKey:"background",text:"This is an ordinary longer answer with several words.",counselIntervened:false},
        {turnId:"2",topicKey:"background",text:"Another ordinary longer answer containing several harmless words.",counselIntervened:false},
        {turnId:"3",topicKey:"aircraft",text:"I do not recall.",counselIntervened:false},
      ],
      patternRows:[],
      anomalyDirectives:[{
        directiveId:"d1",anomalyRef:"anomaly:date",query:"find matching calendar date",
        expectedEvidenceType:"calendar",maxDepth:2,maxHopsPerAttempt:2,
        stoppingCondition:"calendar family exhausted",triggerEvidenceRefs:["page:1"],
      }],
      checkpointRef:"checkpoint:1",
    });
    expect(out.typology).toBe("legal_deposition");
    expect(out.structuralEntities.map(e=>e.kind)).toEqual(expect.arrayContaining(["email","tail_number","date"]));
    expect(out.unresolvedIdentityMentionIds).toEqual(["m1"]);
    expect(out.interrupts).toHaveLength(1);
    expect(out.interrupts[0].status).toBe("queued");
    expect(out.status).toBe("hold_for_source_identity_privacy_and_human_review");
  });
});
