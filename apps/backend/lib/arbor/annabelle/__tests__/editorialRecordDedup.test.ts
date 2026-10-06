import{describe,expect,it}from"vitest";import{dedupeEditorialRecords,editorialRecordKey}from"../editorialRecordDedup";
describe("editorial record dedup",()=>{it("suppresses exact duplicate durable identities independent of locator key order",()=>{
 const a={manuscriptId:"m",chapterNumber:2,recordType:"editor_note",subject:"rhythm",sourceSha256:"a",sourceLocator:{chapter:2,index:0}};
 const b={...a,sourceLocator:{index:0,chapter:2}};
 const out=dedupeEditorialRecords([a,b]);expect(out.unique).toHaveLength(1);expect(out.duplicateKeys).toHaveLength(1);expect(editorialRecordKey(a)).toBe(editorialRecordKey(b));
});});
