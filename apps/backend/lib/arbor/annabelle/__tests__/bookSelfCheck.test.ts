import { describe, expect, it } from "vitest";
import { runAnnabelleBookSelfCheck } from "../bookSelfCheck";

describe("Annabelle Book Engine self-check",()=>{
  it("keeps diagnostics advisory and grouped by severity",()=>{
    const report=runAnnabelleBookSelfCheck("Coffee. Coffee. Coffee. Coffee. Your face is loud. I haven't spoken. You didn't have to.");
    expect(report.diagnostics.some(d=>d.engine==="sensory-expansion")).toBe(true);
    expect(report.diagnostics.some(d=>d.engine==="face-loud-family")).toBe(true);
    expect(report.protectedPrinciples.some(x=>x.includes("not banned"))).toBe(true);
  });
});
