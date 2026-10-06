import { runAnnabelleBookSelfCheck } from "./bookSelfCheck";
import { diagnosticsToEditorialRecords } from "./diagnosticRecords";

export type ChapterAcceptanceResult={
 chapterNumber:number;
 sourceSha256:string;
 passed:boolean;
 blockers:number;
 watches:number;
 notes:number;
 protectedPrinciples:readonly string[];
 records:ReturnType<typeof diagnosticsToEditorialRecords>;
};

export function runChapterAcceptanceFixture(input:{chapterNumber:number;text:string;sourceSha256:string}):ChapterAcceptanceResult{
 if(!input.text.trim()) throw new Error("annabelle_acceptance_empty_chapter");
 const report=runAnnabelleBookSelfCheck(input.text);
 const records=diagnosticsToEditorialRecords({diagnostics:report.diagnostics,chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256});
 return {chapterNumber:input.chapterNumber,sourceSha256:input.sourceSha256,passed:report.blockers.length===0,
 blockers:report.blockers.length,watches:report.watches.length,notes:report.notes.length,protectedPrinciples:report.protectedPrinciples,records};
}
