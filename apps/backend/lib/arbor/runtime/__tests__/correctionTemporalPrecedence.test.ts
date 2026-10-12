import{describe,expect,it}from"vitest";
import{mergeCorrections,mergeCorrectionSnapshots}from"../runtimeState";
describe("correction temporal precedence",()=>{it("uses newest observation without double-counting copied snapshots",()=>{
 const old={id:"x",kind:"behavior" as const,value:"continue",source:"text" as const,observedAt:"2026-01-01T00:00:00Z",confidence:.9,protected:true,occurrences:2};
 const newer={...old,observedAt:"2026-02-01T00:00:00Z",occurrences:3};
 const merged=mergeCorrectionSnapshots([[old],[old,newer]]);
 expect(merged).toHaveLength(1);expect(merged[0].observedAt).toBe(newer.observedAt);expect(merged[0].occurrences).toBe(3);
}); it("does not treat a stale unkeyed correction as new evidence after restart",()=>{
  const newer={id:"behavior:continuity",kind:"behavior" as const,
    value:"Remember the latest correction",source:"text" as const,
    observedAt:"2026-10-12T08:00:00Z",confidence:1,protected:true,occurrences:1};
  const older={...newer,value:"Remember the older correction",
    observedAt:"2026-10-11T08:00:00Z"};
  const once=mergeCorrections([newer],[older]);
  expect(once).toMatchObject([{value:newer.value,observedAt:newer.observedAt,occurrences:1}]);
  const replayed=mergeCorrections(mergeCorrections(once,[older]),[older]);
  expect(replayed[0].occurrences).toBe(1);
  expect(replayed[0].value).toBe(newer.value);
  const fresh={...newer,observedAt:"2026-10-12T09:00:00Z"};
  expect(mergeCorrections(replayed,[fresh])[0].occurrences).toBe(2);
 });
 it("continues to count a genuinely new older observation with a unique host ID",()=>{
  const newer={id:"behavior:continuity",kind:"behavior" as const,value:"Remember this",
    source:"text" as const,observedAt:"2026-10-12T08:00:00Z",
    confidence:1,protected:true,occurrences:1,
    observationIds:["message:owner:latest"],legacyOccurrences:0};
  const older={...newer,observedAt:"2026-10-11T08:00:00Z",
    observationIds:["message:owner:older"]};
  const combined=mergeCorrections([newer],[older]);
  expect(combined[0].observedAt).toBe(newer.observedAt);
  expect(combined[0].occurrences).toBe(2);
  expect(mergeCorrections(combined,[older])[0].occurrences).toBe(2);
 });
});
