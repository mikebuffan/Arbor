import{describe,expect,it}from"vitest";
import{EVER_AFTER_CANONICAL_SOURCE,EVER_AFTER_CHAPTER_TWO,assertCanonicalEverAfterChapterTwo}from"../everAfterCanonicalSource";
import{ANNABELLE_GOLD_EXEMPLAR_CANDIDATES,goldCatalogWarnings,validatedGoldExemplars}from"../goldExemplarCatalog";
describe("Ever After canonical source",()=>{
 it("binds Chapter Two to durable manuscript provenance",()=>{
  expect(()=>assertCanonicalEverAfterChapterTwo({
   manuscriptId:EVER_AFTER_CANONICAL_SOURCE.manuscriptId,
   manuscriptSha256:EVER_AFTER_CANONICAL_SOURCE.sourceSha256,
   chapterNumber:2,
   chapterSourceSha256:EVER_AFTER_CHAPTER_TWO.sourceSha256,
   sourceLocator:EVER_AFTER_CHAPTER_TWO.sourceLocator,
  })).not.toThrow();
 });
 it("does not silently promote candidate Gold anchors",()=>{
  expect(ANNABELLE_GOLD_EXEMPLAR_CANDIDATES.length).toBeGreaterThan(0);
  expect(validatedGoldExemplars(ANNABELLE_GOLD_EXEMPLAR_CANDIDATES)).toEqual([]);
  expect(goldCatalogWarnings(ANNABELLE_GOLD_EXEMPLAR_CANDIDATES).join(" ")).toMatch(/explicit validation/i);
 });
});
