import { runAnnabelleBookSelfCheck } from "./bookSelfCheck";
import { diagnosticsToEditorialRecords } from "./diagnosticRecords";
import { protectGoldEdits, type ProtectedSpan } from "./goldProtection";

export type ChapterAcceptanceResult={
 chapterNumber:number;
 sourceSha256:string;
 passed:boolean;
 blockers:number;
 watches:number;
 notes:number;
 protectedEditAllowed:boolean;
 protectedViolations:string[];
 protectedPrinciples:readonly string[];
 records:ReturnType<typeof diagnosticsToEditorialRecords>;
};

export function runChapterAcceptanceFixture(input:{
 chapterNumber:number;
 text:string;
 sourceSha256:string;
 beforeText?:string;
 protectedSpans?:readonly ProtectedSpan[];
 explicitProtectedOverride?:boolean;
}):ChapterAcceptanceResult{
 if(!input.text.trim()) throw new Error("annabelle_acceptance_empty_chapter");
 const report=runAnnabelleBookSelfCheck(input.text);
 const records=diagnosticsToEditorialRecords({diagnostics:report.diagnostics,chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256});
 const protection=input.beforeText===undefined?{allowed:true,violations:[]}:
   protectGoldEdits({before:input.beforeText,after:input.text,protectedSpans:input.protectedSpans??[],explicitOverride:input.explicitProtectedOverride});
 return {
  chapterNumber:input.chapterNumber,
  sourceSha256:input.sourceSha256,
  passed:report.blockers.length===0&&protection.allowed,
  blockers:report.blockers.length,
  watches:report.watches.length,
  notes:report.notes.length,
  protectedEditAllowed:protection.allowed,
  protectedViolations:protection.violations,
  protectedPrinciples:report.protectedPrinciples,
  records,
 };
}
