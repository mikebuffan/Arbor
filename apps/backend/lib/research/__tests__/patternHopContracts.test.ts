import{describe,expect,it}from"vitest";import{chooseBoundedBranch,evaluatePatternHop,hopLineage}from"../patternHopContracts";
describe("pattern hop contracts",()=>{
 it("preserves independence, contradiction and alias gates",()=>{const r=evaluatePatternHop({aliases:[{left:"John A",right:"John B",decision:"unresolved",evidenceIds:[]}],evidence:[
  {id:"1",sourceFamily:"calendar",entity:"John A",relation:"at",target:"NY",sourceSha256:"a",uncertainty:.1},
  {id:"2",sourceFamily:"calendar",entity:"John A",relation:"at",target:"LA",sourceSha256:"b",uncertainty:.2},
  {id:"3",sourceFamily:"witness",entity:"John B",relation:"at",target:"NY",sourceSha256:"c",uncertainty:.4},
 ]});expect(r.contradictions).toHaveLength(1);expect(r.entityBlocks).toContain("3");expect(r.independentFamilies).toBe(1);});
 it("reroutes bounded branches and preserves lineage",()=>{expect(chooseBoundedBranch([{id:"a",score:1,visited:false,failed:true},{id:"b",score:.8,visited:false,failed:false},{id:"c",score:.7,visited:false,failed:false}],1).map(x=>x.id)).toEqual(["b"]);expect(hopLineage([{id:"a",sourceFamily:"x",entity:"e",relation:"r",target:"t",sourceSha256:"a",uncertainty:.1},{id:"b",sourceFamily:"y",entity:"e",relation:"r2",target:"t2",sourceSha256:"b",parentHopId:"a",uncertainty:.2}],"b")).toEqual(["a","b"]);});
});
