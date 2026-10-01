export const EDITORIAL_RECORD_TYPES = [
  "reader_reaction","editor_note","voice_evidence","gold_exemplar","canon",
  "character_state","relationship_state","knowledge_state","timeline",
  "thread_payoff","motif","physicality","location","injury_recovery",
  "problem","decision","do_not_touch","production_artifact","duplicate",
  "contradiction","impact",
] as const;

export type EditorialRecordType = typeof EDITORIAL_RECORD_TYPES[number];
export type EditorialPass = "diagnostic" | "continuous" | "editing" | "proof" | "voice_integrity";
export type EditorialConfidence = "observed" | "probable" | "confirmed" | "hypothesis" | "contradictory" | "rejected";

export type EditorialSource = {
  manuscriptId: string;
  chapterId?: string;
  chapterNumber?: number;
  sourceSha256?: string;
  locator?: Record<string, unknown>;
};

export type EditorialRecord = {
  id?: string;
  type: EditorialRecordType;
  subject?: string;
  content: Record<string, unknown>;
  confidence: number;
  epistemicStatus: EditorialConfidence;
  source: EditorialSource;
  supersedesId?: string;
};

export type EditorialCheckpoint = {
  pass: EditorialPass;
  chapterNumber: number;
  status: "ready" | "in_progress" | "checkpointed" | "complete" | "blocked";
  state: Record<string, unknown>;
};

export function assertEditorialRecord(record: EditorialRecord): void {
  if (!EDITORIAL_RECORD_TYPES.includes(record.type)) throw new Error("editorial_record_type_invalid");
  if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) throw new Error("editorial_confidence_invalid");
  if (!record.source.manuscriptId?.trim()) throw new Error("editorial_manuscript_required");
  if (record.epistemicStatus === "confirmed" && record.type === "voice_evidence") {
    const evidenceCount = Number(record.content.evidenceCount ?? 0);
    if (!Number.isInteger(evidenceCount) || evidenceCount < 2) {
      throw new Error("annabelle_voice_confirmation_requires_repeated_evidence");
    }
  }
}

export function canRewriteFromDiagnostic(records: EditorialRecord[]): boolean {
  const hasProblem = records.some((r) => r.type === "problem");
  const hasSource = records.every((r) => Boolean(r.source.sourceSha256 || r.source.locator));
  return hasProblem && hasSource;
}

export function downstreamImpactChapters(
  changedChapter: number,
  chapterCount: number,
): number[] {
  if (!Number.isInteger(changedChapter) || changedChapter < 1) return [];
  return Array.from(
    { length: Math.max(0, chapterCount - changedChapter) },
    (_, index) => changedChapter + index + 1,
  );
}
