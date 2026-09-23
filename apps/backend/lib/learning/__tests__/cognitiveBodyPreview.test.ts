import { describe, expect, it } from "vitest";
import { previewCognitiveBodyCycle } from "../cognitiveBodyPreview";
import { runAssociativeLearningBenchmark } from "../associativeLearningBenchmark";
import type { NeuralPathway } from "../neuralPathwayNetwork";
import type { ScopedHopEvidence } from "../cognitiveAssembly";
const scope={userId:"synthetic-owner",projectId:"synthetic-project"};
const ev:ScopedHopEvidence={...scope,id:"e0",source:"fixture",sourceFamilyId:"one-report",evidenceType:"fixture",content:"active objective correction",confidence:0.9,epistemicStatus:"direct",retrievalScore:0.9,retrievalMethod:"fixture"};
const pathway:NeuralPathway={...scope,id:"p0",cues:["route:objective"],associatedSystems:["executive"],type:"association",action:"suggest_context",status:"active",strength:0.8,evidenceRefs:["fixture"],lastReinforcedAt:"2026-09-23T00:00:00Z",protected:false};
const b=runAssociativeLearningBenchmark().state;
const input=()=>({scope,cue:"Keep going to the next task",seed:ev,candidates:[],learning:{...b,...scope},pathways:[pathway],bodyContext:{mode:"text" as const,activeSubsystem:"arbor" as const}});
describe("actual body-state × Pathway/Pattern Hop read-only preview",()=>{
  it("reuses existing body state, trained router and pathway suggestions",()=>{
    const result=previewCognitiveBodyCycle(input());
    expect(result.body.schemaVersion).toBe(1);
    expect(result.body.nervous.sequence).toContain("self-correct");
    expect(result.cycle.route).toBe("objective");
    expect(result.cycle.suggestedSystems).toContain("executive");
    expect(result.nextActionHint).toBe("respond");
    expect(result.grantsExecution).toBe(false);
    expect(result.liveWorkVerified).toBe(false);
  });
  it("host-loaded unresolved objective changes body hint, but never action authority",()=>{
    const base=input();
    const result=previewCognitiveBodyCycle({...base,bodyContext:{...base.bodyContext,continuity:{
      currentGoal:"Finish synthetic module",lastMeaningfulUserTurn:null,lastMeaningfulArborTurn:null,
      unresolvedWork:["Write tests"],recurringWeaknesses:[],retainedStrategies:[],activeCorrections:[],
      activeSubsystem:"arbor",channel:"text",
    }}});
    expect(result.nextActionHint).toBe("continue");
    expect(result.body.hippocampal.temporalAnchors).toContain("Finish synthetic module");
    expect(result.grantsExecution).toBe(false);
  });
  it("invalid body mode fails closed",()=>{
    const base=input();
    expect(()=>previewCognitiveBodyCycle({...base,bodyContext:{...base.bodyContext,mode:"unknown" as "text"}}))
      .toThrow("cognitive_body_context_invalid");
  });
});