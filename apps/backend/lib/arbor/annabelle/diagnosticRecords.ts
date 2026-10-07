import type { AnnabelleDiagnostic } from "./editorialEngines";

export type AnnabelleDiagnosticRecord = {
  recordType: "editor_note";
  subject: string;
  content: {
    advisory: true;
    engine: string;
    severity: AnnabelleDiagnostic["severity"];
    message: string;
    evidence: string[];
    count?: number;
  };
  epistemicStatus: "observed";
  sourceLocator: { chapterNumber: number; diagnosticIndex: number };
  sourceSha256: string;
};

export function diagnosticsToEditorialRecords(input:{
  diagnostics: readonly AnnabelleDiagnostic[];
  chapterNumber:number;
  sourceSha256:string;
}):AnnabelleDiagnosticRecord[]{
  if(!Number.isSafeInteger(input.chapterNumber)||input.chapterNumber<=0) throw new Error("annabelle_diagnostic_invalid_chapter");
  if(!/^[a-f0-9]{64}$/i.test(input.sourceSha256)) throw new Error("annabelle_diagnostic_invalid_source_hash");
  return input.diagnostics.map((diagnostic,index)=>({
    recordType:"editor_note",
    subject:`diagnostic:${diagnostic.engine}`,
    content:{
      advisory:true,
      engine:diagnostic.engine,
      severity:diagnostic.severity,
      message:diagnostic.message,
      evidence:[...diagnostic.evidence],
      ...(diagnostic.count===undefined?{}:{count:diagnostic.count}),
    },
    epistemicStatus:"observed",
    sourceLocator:{chapterNumber:input.chapterNumber,diagnosticIndex:index},
    sourceSha256:input.sourceSha256,
  }));
}

export function assertDiagnosticsAdvisory(records:readonly AnnabelleDiagnosticRecord[]):void{
  for(const record of records){
    if(record.recordType!=="editor_note"||record.content.advisory!==true||record.epistemicStatus!=="observed")
      throw new Error("annabelle_diagnostic_must_remain_advisory");
  }
}
