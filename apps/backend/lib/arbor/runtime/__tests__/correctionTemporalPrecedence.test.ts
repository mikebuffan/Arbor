import{describe,expect,it}from"vitest";
import{mergeCorrectionSnapshots}from"../runtimeState";
describe("correction temporal precedence",()=>{it("uses newest observation without double-counting copied snapshots",()=>{
 const old={id:"x",kind:"behavior" as const,value:"continue",source:"text" as const,observedAt:"2026-01-01T00:00:00Z",confidence:.9,protected:true,occurrences:2};
 const newer={...old,observedAt:"2026-02-01T00:00:00Z",occurrences:3};
 const merged=mergeCorrectionSnapshots([[old],[old,newer]]);
 expect(merged).toHaveLength(1);expect(merged[0].observedAt).toBe(newer.observedAt);expect(merged[0].occurrences).toBe(3);
});});
