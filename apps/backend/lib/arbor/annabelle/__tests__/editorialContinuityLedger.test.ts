import{describe,expect,it}from"vitest";
import{buildEditorialContinuityLedger}from"../editorialContinuityLedger";

describe("editorial continuity ledger",()=>{
 it("tracks scene delta, physical continuity, internal clock and downstream chapters",()=>{
  const a="a".repeat(64),b="b".repeat(64);
  const r=buildEditorialContinuityLedger([
   {chapterNumber:1,sourceSha256:a,
    physical:[{chapter:1,character:"Ever",injuries:{hip:"chronic"},compensations:["hitch"],scars:["shoulder"]}],
    continuity:[{chapter:1,elapsedDays:0,season:"winter",characters:["Ever"],location:"apartment",clothing:{Ever:"navy jacket"},objects:{jacket:"chair"}}],
    screenBeats:[{chapter:1,scene:"s1",characters:["Ever"]}],
    motifs:[{motif:"purple pumpkin",chapter:1,role:"first",sourceSha256:a}],
    scenes:[{sceneId:"s1",before:{knowledge:[],relationships:{},body:[],threats:[],goals:["leave"],objects:{door:"closed"},motifs:[]},after:{knowledge:["Mercer expects her"],relationships:{},body:[],threats:[],goals:["meeting"],objects:{door:"open"},motifs:[]}}]},
   {chapterNumber:2,sourceSha256:b,
    physical:[{chapter:2,character:"Ever",injuries:{},compensations:[],scars:[]}],
    continuity:[{chapter:2,elapsedDays:1,season:"winter",characters:["Ever","Mara"],location:"collection house"}],
    screenBeats:[{chapter:2,scene:"s2",characters:["Ever","Mara"]}],
    motifs:[{motif:"purple pumpkin",chapter:2,role:"echo",sourceSha256:b}]}
  ]);
  expect(r.sceneDeltas[0].changed).toBe(true);
  expect(r.physicalIssues.length).toBeGreaterThan(0);
  expect(r.continuity.elapsedDays).toBe(1);
  expect(r.downstreamByChapter[1].affectedChapters).toContain(2);
 });
 it("refuses conflicting source versions for the same chapter",()=>{
  expect(()=>buildEditorialContinuityLedger([
   {chapterNumber:2,sourceSha256:"a".repeat(64)},
   {chapterNumber:2,sourceSha256:"b".repeat(64)}
  ])).toThrow("annabelle_ledger_source_conflict");
 });
});
