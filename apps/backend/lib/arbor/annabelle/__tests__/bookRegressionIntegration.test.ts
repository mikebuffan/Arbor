import{describe,expect,it}from"vitest";
import{runBookRegressionSuite}from"../bookRegressionSuite";
describe("integrated book regression",()=>{
 it("includes continuity, screen-time and downstream impact without turning advisory gaps into blockers",()=>{
  const r=runBookRegressionSuite({
   text:"She opened the door. She stayed.",
   changedChapter:1,
   continuity:[{chapter:1,elapsedDays:0,characters:["Ever"],location:"apartment"},{chapter:2,elapsedDays:1,characters:["Ever","Will"],location:"bar"}],
   screenBeats:[{chapter:1,scene:"a",characters:["Ever"]},{chapter:2,scene:"b",characters:["Ever","Will"]}],
   motifs:[{motif:"door",chapter:1,role:"first",sourceSha256:"a".repeat(64)},{motif:"door",chapter:2,role:"echo",sourceSha256:"b".repeat(64)}],
  });
  expect(r.continuity.elapsedDays).toBe(1);
  expect(r.downstream?.affectedChapters).toContain(2);
  expect(Array.isArray(r.screenTime)).toBe(true);
 });
});
