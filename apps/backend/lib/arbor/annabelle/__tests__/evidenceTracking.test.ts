import{describe,expect,it}from"vitest";
import{summarizeCharacterEvidence}from"../characterEvidenceTracking";
import{inspectRelationshipStages}from"../relationshipStageTracking";
describe("source-backed editorial tracking",()=>{
 it("summarizes character traits only from source-backed observations",()=>{
  const rows=summarizeCharacterEvidence([{id:"e1",character:"Ever",chapter:2,sourceSha256:"a".repeat(64),evidence:["door scan"],voiceTraits:["dry"],behaviorTraits:["protect boundary"],noticing:["exits"],speechTraits:["restrained"]}]);
  expect(rows[0].voiceTraits.dry).toBe(1);expect(rows[0].noticing.exits).toBe(1);
 });
 it("requires evidence for relationship stage movement",()=>{
  const issues=inspectRelationshipStages([
   {id:"r1",pair:"Ever/Will",chapter:2,sourceSha256:"a".repeat(64),stage:"early",trust:2,evidence:["meeting"]},
   {id:"r2",pair:"Ever/Will",chapter:3,sourceSha256:"b".repeat(64),stage:"closer",trust:4,evidence:[]},
  ]);
  expect(issues.map(x=>x.kind)).toContain("stage-without-evidence");
  expect(issues.map(x=>x.kind)).toContain("trust-without-evidence");
 });
});
