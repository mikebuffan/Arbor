import{describe,expect,it}from"vitest";
import{validateSupersessionGraph}from"../editorialSupersession";
describe("editorial supersession provenance",()=>{
 it("reports missing parents, self links, time inversion and duplicate ids",()=>{
  const rows=[
   {id:"a",supersedesId:"missing",epistemicStatus:"confirmed" as const,createdAt:"2026-02-01T00:00:00Z"},
   {id:"b",supersedesId:"b",epistemicStatus:"confirmed" as const,createdAt:"2026-02-01T00:00:00Z"},
   {id:"c",supersedesId:null,epistemicStatus:"confirmed" as const,createdAt:"2026-03-01T00:00:00Z"},
   {id:"d",supersedesId:"c",epistemicStatus:"confirmed" as const,createdAt:"2026-01-01T00:00:00Z"},
   {id:"a",supersedesId:null,epistemicStatus:"confirmed" as const,createdAt:"2026-04-01T00:00:00Z"},
  ];
  const errors=validateSupersessionGraph(rows);
  expect(errors.some(x=>x.startsWith("missing-parent:"))).toBe(true);
  expect(errors).toContain("self-supersession:b");
  expect(errors).toContain("time-inversion:d->c");
  expect(errors).toContain("duplicate-id:a");
 });
});