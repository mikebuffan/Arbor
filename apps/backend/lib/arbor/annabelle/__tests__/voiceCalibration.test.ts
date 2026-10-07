import{describe,expect,it}from"vitest";
import{calibrateMatureAnnabelleVoice}from"../voiceCore";
describe("mature Annabelle Gold calibration",()=>{
 it("uses only source-backed Gold evidence",()=>{
  const r=calibrateMatureAnnabelleVoice({text:"Ever watched the door and waited.",character:"Ever",evidence:[
   {text:"Ever watched the door before she answered.",sourceSha256:"a".repeat(64),gold:true,mature:true,character:"Ever"},
   {text:"generic fake exemplar",sourceSha256:"not-a-hash",gold:true,character:"Ever"},
   {text:"not gold",sourceSha256:"b".repeat(64),gold:false,character:"Ever"},
  ]});
  expect(r.sourceBackedGold).toBe(1);
  expect(r.sufficientEvidence).toBe(true);
  expect(r.matches[0].character).toBe("Ever");
 });
 it("does not invent a verdict when Gold is absent",()=>{
  const r=calibrateMatureAnnabelleVoice({text:"x",evidence:[]});
  expect(r.sufficientEvidence).toBe(false);
  expect(r.warnings[0]).toMatch(/do not invent/i);
 });
});
