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

it("rejects conflicting task records instead of replaying a completed task",()=>{
 const duplicate=[
  {id:"same",dependencies:[],status:"complete" as const},
  {id:"same",dependencies:[],status:"pending" as const,priority:100},
 ];
 expect(()=>planBacklogContinuation(duplicate)).toThrow("backlog_duplicate_id");
 expect(()=>nextIndependentWork(duplicate,"other")).toThrow("backlog_duplicate_id");
});
it("rejects malformed identifiers, statuses and dependencies before selection",()=>{
 const valid={id:"x",dependencies:[],status:"pending" as const};
 for(const invalid of [
  {...valid,id:" "},
  {...valid,id:" x "},
  {...valid,dependencies:[""]},
  {...valid,dependencies:null},
  {...valid,status:"unknown"},
  {...valid,protectedBoundary:"false"},
 ]) {
  expect(()=>planBacklogContinuation([invalid] as never)).toThrow("backlog_invalid_item");
 }
});
it("keeps missing and self dependencies waiting even for the top-ranked item",()=>{
 expect(planBacklogContinuation([
  {id:"self",dependencies:["self"],status:"pending",priority:100},
  {id:"independent",dependencies:[],status:"pending",priority:1},
 ]).runnable).toEqual(["independent"]);
});

it("a max-priority pending protected action never enters runnable work",()=> {
 const items=[
  {id:"protected-action",dependencies:[],status:"pending" as const,protectedBoundary:true,priority:100},
  {id:"safe-inspection",dependencies:[],status:"pending" as const,priority:1},
 ];
 expect(planBacklogContinuation(items)).toMatchObject({
  runnable:["safe-inspection"],humanBoundaries:["protected-action"],
 });
 expect(nextIndependentWork(items,"unrelated")).toBe("safe-inspection");
});
