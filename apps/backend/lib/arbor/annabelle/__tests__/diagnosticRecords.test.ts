import { describe, expect, it } from "vitest";
import { assertDiagnosticsAdvisory, diagnosticsToEditorialRecords } from "../diagnosticRecords";

describe("Annabelle diagnostic records",()=>{
  it("binds advisory diagnostics to exact chapter source provenance",()=>{
    const records=diagnosticsToEditorialRecords({chapterNumber:2,sourceSha256:"a".repeat(64),diagnostics:[{engine:"rhythm",severity:"watch",message:"check rhythm",evidence:["Short."]}]});
    expect(records[0].content.advisory).toBe(true);
    expect(records[0].sourceLocator.chapterNumber).toBe(2);
    expect(records[0].sourceSha256).toBe("a".repeat(64));
    expect(()=>assertDiagnosticsAdvisory(records)).not.toThrow();
  });
});
