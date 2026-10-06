import{describe,expect,it}from"vitest";
import{independentCorroboration,sourceIndependenceScore,validateEvidenceProvenance}from"../evidenceProvenance";
describe("evidence provenance",()=>{it("does not mistake repeated reporting for independent corroboration",()=>{
 const base={sourceSha256:"a".repeat(64),sourceLocator:"p1",sourceFamily:"newswire",hopLineage:["h1"],counterevidenceIds:[],uncertainty:.2,findingVersion:1};
 const rows=[{...base,evidenceId:"1"},{...base,evidenceId:"2"}];
 expect(independentCorroboration(rows)).toBe(1);
 expect(sourceIndependenceScore(rows)).toBe(.5);
 expect(validateEvidenceProvenance({...base,evidenceId:"1"})).toEqual([]);
});it("scores independent families higher than repeated copies",()=>{
 const base={sourceSha256:"b".repeat(64),sourceLocator:"p2",hopLineage:["h1"],counterevidenceIds:[],uncertainty:.2,findingVersion:1};
 expect(sourceIndependenceScore([{...base,evidenceId:"1",sourceFamily:"calendar"},{...base,evidenceId:"2",sourceFamily:"witness"}])).toBe(1);
});});
