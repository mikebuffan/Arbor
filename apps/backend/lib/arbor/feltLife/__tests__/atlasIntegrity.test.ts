import{describe,expect,it}from"vitest";
import{FELT_LIFE_ATLAS,auditFeltLifeAtlas,assertFeltLifeAtlasIntegrity,inferFeltLife}from"../atlas";
describe("Felt-Life atlas integrity",()=>{
 it("has broad unique coverage while remaining hypothesis-not-verdict",()=>{
  const report=auditFeltLifeAtlas();
  expect(report.entryCount).toBeGreaterThanOrEqual(90);
  expect(report.duplicateIds).toEqual([]);
  expect(report.invalidEntries).toEqual([]);
  expect(new Set(report.valences)).toEqual(new Set(["pleasant","unpleasant","mixed","neutral"]));
  expect(new Set(report.activations)).toEqual(new Set(["low","medium","high"]));
  expect(()=>assertFeltLifeAtlasIntegrity()).not.toThrow();
  expect(inferFeltLife({text:"She was shaking after the scare but knew it was over."}).guard).toBe("hypothesis-not-verdict");
 });
 it("contains no duplicate ids",()=>expect(new Set(FELT_LIFE_ATLAS.map(x=>x.id)).size).toBe(FELT_LIFE_ATLAS.length));
});
