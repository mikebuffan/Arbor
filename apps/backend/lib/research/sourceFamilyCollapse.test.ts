import {describe,expect,it} from "vitest";
import {collapseSourceFamilies} from "./sourceFamilyCollapse";
import {originalSourceIdentity} from "./sourceVersion";

const source=(documentId:string,sourceUri:string,hash:string)=>originalSourceIdentity({
  documentId,
  sourceUri,
  originalBytesSha256:hash,
  originalByteLength:100,
  declaredPageCount:1,
});

describe("source family collapse",()=>{
  it("collapses byte-identical mirrors, same-location versions, and shared upstream records conservatively",()=>{
    const a=source("a","https://example.test/a.pdf","a".repeat(64));
    const b=source("b","https://mirror.test/a.pdf","a".repeat(64));
    const c=source("c","https://example.test/c.pdf","c".repeat(64));
    const d=source("d","https://example.test/c.pdf","d".repeat(64));
    const e=source("e","https://third.test/e.pdf","e".repeat(64));
    const f=source("f","https://fourth.test/f.pdf","f".repeat(64));

    const r=collapseSourceFamilies([
      {recordId:"a",source:a,upstreamRecordIds:[]},
      {recordId:"b",source:b,upstreamRecordIds:[]},
      {recordId:"c",source:c,upstreamRecordIds:[]},
      {recordId:"d",source:d,upstreamRecordIds:[]},
      {recordId:"e",source:e,upstreamRecordIds:["underlying-report"]},
      {recordId:"f",source:f,upstreamRecordIds:["underlying-report"]},
    ]);

    expect(r.families).toHaveLength(3);
    expect(r.recordToFamily.a).toBe(r.recordToFamily.b);
    expect(r.recordToFamily.c).toBe(r.recordToFamily.d);
    expect(r.recordToFamily.e).toBe(r.recordToFamily.f);
    expect(r.families.find(x=>x.recordIds.includes("a"))?.linkReasons).toContain("same_content");
    expect(r.families.find(x=>x.recordIds.includes("c"))?.linkReasons).toContain("same_location_version");
    expect(r.families.find(x=>x.recordIds.includes("e"))?.linkReasons).toContain("shared_upstream");
    expect(r.unresolvedUpstreamRecordIds).toEqual(["underlying-report"]);
    expect(r.status).toBe("family_collapse_not_truth");
  });

  it("does not collapse distinct sources merely because they are about the same investigation",()=>{
    const a=source("a","https://one.test/a.pdf","1".repeat(64));
    const b=source("b","https://two.test/b.pdf","2".repeat(64));
    const r=collapseSourceFamilies([
      {recordId:"a",source:a,upstreamRecordIds:[]},
      {recordId:"b",source:b,upstreamRecordIds:[]},
    ]);
    expect(r.families).toHaveLength(2);
    expect(r.recordToFamily.a).not.toBe(r.recordToFamily.b);
  });

  it("rejects self-upstream provenance instead of hiding it in a family",()=>{
    const a=source("a","https://one.test/a.pdf","1".repeat(64));
    expect(()=>collapseSourceFamilies([
      {recordId:"a",source:a,upstreamRecordIds:["a"]},
    ])).toThrow("source_family_self_upstream");
  });
});
