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
});
