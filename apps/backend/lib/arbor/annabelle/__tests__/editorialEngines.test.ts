import { describe, expect, it } from "vitest";
import { runAnnabelleEditorialDiagnostics } from "../editorialEngines";

describe("Annabelle editorial diagnostics", () => {
  it("flags repeated sensory defaults without banning a single use", () => {
    const one=runAnnabelleEditorialDiagnostics("Coffee cooled beside her.");
    expect(one.some(x=>x.engine==="sensory-expansion")).toBe(false);
    const many=runAnnabelleEditorialDiagnostics("Coffee cooled. Coffee burned. Coffee waited. Coffee went cold.");
    expect(many.some(x=>x.engine==="sensory-expansion")).toBe(true);
  });
  it("flags archive humor only when it becomes a pattern", () => {
    expect(runAnnabelleEditorialDiagnostics("Chain of custody? Compromised.").some(x=>x.engine==="archive-humor")).toBe(false);
    const text="Chain of custody? Compromised. That required institutional support. Evidence, not permission.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="archive-humor")).toBe(true);
  });
  it("flags face shorthand density rather than banning the device", () => {
    const text="Your face is loud.\n\nI haven't spoken.\n\nYou didn't have to.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="face-loud-family")).toBe(true);
  });
  it("flags repeated paragraph assembly", () => {
    const p="The room returned around him one witness at a time, and nobody moved to rescue him.";
    const out=runAnnabelleEditorialDiagnostics(`${p}\n\nSomething else happened.\n\n${p}`);
    expect(out.some(x=>x.engine==="duplicate-assembly")).toBe(true);
  });
  it("flags explanatory echo after evidence", () => {
    const text="Her hand locked around the glass and her shoulders went rigid. She realized her shoulders were rigid because the threat had frightened her.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="explanation-redundancy")).toBe(true);
  });
  it("flags fragment saturation without banning fragments", () => {
    const text=Array.from({length:30},(_,i)=>i%2===0?"Too late.":"She crossed the room and put the folder on the table before anyone could stop her.").join(" ");
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="rhythm")).toBe(true);
  });

  it("flags explanation residue only when it clusters", () => {
    const text="This meant he knew. The point was she had seen it. That was the thing. In other words, nobody needed to say it.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="explanation-redundancy")).toBe(true);
  });
  it("flags repeated generic body shorthand", () => {
    const text="Her breath caught. His jaw tightened. Her stomach dropped. His pulse jumped. Her shoulders tightened.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="embodied-perspective")).toBe(true);
  });

  it("flags writer-performance clustering for Raw Gravity review", () => {
    const text="It was the kind of silence people remembered. Something ancient moved through it. She was beautifully broken.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="raw-gravity")).toBe(true);
  });
  it("flags possible close-third camera leaks", () => {
    expect(runAnnabelleEditorialDiagnostics("Unbeknownst to her, he closed the door.").some(x=>x.engine==="camera")).toBe(true);
  });
  it("flags explicit realization density", () => {
    const text="She realized it. He understood. She knew then. It dawned on him. She realized why.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="discovery-density")).toBe(true);
  });

  it("flags generic touch shorthand density",()=>{
    const text="Electricity sparked. She shivered. He trembled. Her breath hitched. Another shiver followed.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="touch")).toBe(true);
  });
  it("flags named power fragility when behavior should carry it",()=>{
    const text="It was male fragility. He hated being corrected. He needed control.";
    expect(runAnnabelleEditorialDiagnostics(text).some(x=>x.engine==="power-response")).toBe(true);
  });

  it("handles straight quote dialogue as well as curly quotes",()=>{
    const text=Array.from({length:10},(_,i)=>`"Line ${i}."`).join(" ");
    const out=runAnnabelleEditorialDiagnostics(text);
    expect(Array.isArray(out)).toBe(true);
  });
});
