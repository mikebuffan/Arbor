import {describe,expect,it} from "vitest";
import {runChapterAcceptanceFixture} from "../chapterAcceptance";
describe("Chapter Two acceptance fixture",()=>{it("keeps diagnostics advisory and provenance-bound",()=>{
 const result=runChapterAcceptanceFixture({chapterNumber:2,text:"She opened the door. Will waited. She chose to stay.",sourceSha256:"b".repeat(64)});
 expect(result.chapterNumber).toBe(2); expect(result.sourceSha256).toBe("b".repeat(64));
 expect(result.records.every(r=>r.content.advisory)).toBe(true);
});});