import{describe,expect,it}from"vitest";import{nextIndependentWork,planBacklogContinuation}from"../backlogContinuation";
describe("agency backlog continuation",()=>{it("moves to independent work when another lane is blocked",()=>{const items=[{id:"a",dependencies:[],status:"blocked" as const,protectedBoundary:true},{id:"b",dependencies:[],status:"pending" as const},{id:"c",dependencies:["a"],status:"pending" as const}];const p=planBacklogContinuation(items);expect(p.humanBoundaries).toEqual(["a"]);expect(p.runnable).toEqual(["b"]);expect(p.waiting).toEqual(["c"]);expect(nextIndependentWork(items,"a")).toBe("b");});});


it("selects the highest-ranked eligible work rather than simply first in the list",()=>{
 const items=[
  {id:"low",dependencies:[],status:"pending" as const,priority:1},
  {id:"needs-blocked",dependencies:["blocked"],status:"pending" as const,priority:99},
  {id:"blocked",dependencies:[],status:"blocked" as const,protectedBoundary:true,priority:100},
  {id:"done",dependencies:[],status:"complete" as const,priority:100},
  {id:"high",dependencies:[],status:"pending" as const,priority:8},
  {id:"tie",dependencies:[],status:"pending" as const,priority:8},
 ];
 expect(planBacklogContinuation(items)).toMatchObject({
  runnable:["high","tie","low"],waiting:["needs-blocked"],
  humanBoundaries:["blocked"],complete:["done"],
 });
 expect(nextIndependentWork(items,"blocked")).toBe("high");
 expect(nextIndependentWork(items,"high")).toBe("tie");
});
it("retains original order for equal or absent priorities without inventing scoring",()=>{
 expect(planBacklogContinuation([
  {id:"a",dependencies:[],status:"pending"},
  {id:"b",dependencies:[],status:"pending",priority:0},
  {id:"c",dependencies:[],status:"pending"},
 ]).runnable).toEqual(["a","b","c"]);
});
it.each([NaN,Infinity,-1,101,1.5])("rejects malformed priority %s before planning",priority=>{
 expect(()=>planBacklogContinuation([{id:"x",dependencies:[],status:"pending",priority}]))
 .toThrow("backlog_invalid_priority");
});
it("does not promote missing-dependency work based on a high priority",()=>{
 const items=[
  {id:"missing",dependencies:["not-present"],status:"pending" as const,priority:100},
  {id:"safe",dependencies:[],status:"pending" as const,priority:2},
 ];
 expect(nextIndependentWork(items,"missing")).toBe("safe");
});
