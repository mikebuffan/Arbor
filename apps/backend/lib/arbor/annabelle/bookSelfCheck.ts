import { runAnnabelleEditorialDiagnostics, type AnnabelleDiagnostic } from "./editorialEngines";

export type AnnabelleRegressionReport = {
  diagnostics: AnnabelleDiagnostic[];
  blockers: AnnabelleDiagnostic[];
  watches: AnnabelleDiagnostic[];
  notes: AnnabelleDiagnostic[];
  protectedPrinciples: readonly string[];
};

export const ANNABELLE_PROTECTED_PRINCIPLES = [
  "Diagnostics are advisory evidence, not automatic rewrite instructions.",
  "A repeated device is not a defect until context and intent are classified.",
  "Motif, character habit, trauma recurrence and deliberate echo must survive naive deduplication.",
  "Gold/do-not-touch material requires explicit editorial override.",
  "Expansion changes what is noticed before it reaches for synonyms.",
  "Humor remains character-specific; archive humor and face-says-it shorthand are frequency-controlled, not banned.",
  "Body response does not declare consent, desire, fear or meaning by itself.",
  "Close-third camera may infer only from evidence available to the focal character.",
] as const;

export function runAnnabelleBookSelfCheck(text:string):AnnabelleRegressionReport {
  const diagnostics=runAnnabelleEditorialDiagnostics(text);
  return {
    diagnostics,
    blockers:diagnostics.filter(d=>d.severity==="revise"),
    watches:diagnostics.filter(d=>d.severity==="watch"),
    notes:diagnostics.filter(d=>d.severity==="note"),
    protectedPrinciples:ANNABELLE_PROTECTED_PRINCIPLES,
  };
}
