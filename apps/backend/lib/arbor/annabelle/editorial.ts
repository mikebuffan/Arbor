import type { SupabaseClient } from "@supabase/supabase-js";

export const editorialRecordTypes = [
  "reader_reaction","editor_note","voice_evidence","gold_exemplar","canon",
  "character_state","relationship_state","knowledge_state","timeline",
  "thread_payoff","motif","physicality","location","injury_recovery",
  "problem","decision","do_not_touch","production_artifact","duplicate",
  "contradiction","impact",
] as const;
export type EditorialRecordType = typeof editorialRecordTypes[number];

export async function registerManuscript(input: {
  supabase: SupabaseClient; userId: string; projectId: string; title: string;
  sourceLabel: string; sourceSha256: string; status?: "reference"|"canonical"|"superseded"|"archived";
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await input.supabase.from("annabelle_manuscripts").upsert({
    user_id: input.userId, project_id: input.projectId, title: input.title,
    source_label: input.sourceLabel, source_sha256: input.sourceSha256,
    status: input.status ?? "reference", metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,project_id,source_sha256" }).select("*").single();
  if (error) throw error; return data;
}

export async function registerChapter(input: {
  supabase: SupabaseClient; userId: string; projectId: string; manuscriptId: string;
  chapterNumber: number; label?: string; sourceSha256: string; wordCount: number;
  sourceLocator?: Record<string, unknown>; metadata?: Record<string, unknown>;
}) {
  const { data, error } = await input.supabase.from("annabelle_chapters").upsert({
    manuscript_id: input.manuscriptId, user_id: input.userId, project_id: input.projectId,
    chapter_number: input.chapterNumber, label: input.label ?? null,
    source_sha256: input.sourceSha256, word_count: input.wordCount,
    source_locator: input.sourceLocator ?? {}, metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "manuscript_id,chapter_number" }).select("*").single();
  if (error) throw error; return data;
}

export async function appendEditorialRecord(input: {
  supabase: SupabaseClient; userId: string; projectId: string; manuscriptId: string;
  chapterId?: string; recordType: EditorialRecordType; subject?: string;
  content: Record<string, unknown>; confidence: number;
  epistemicStatus: "observed"|"probable"|"confirmed"|"hypothesis"|"contradictory"|"rejected";
  sourceLocator?: Record<string, unknown>; sourceSha256?: string; supersedesId?: string;
}) {
  if (input.recordType === "voice_evidence" && input.epistemicStatus === "confirmed") {
    const n = Number(input.content.evidenceCount ?? 0);
    if (!Number.isInteger(n) || n < 2) throw new Error("annabelle_voice_confirmation_requires_repeated_evidence");
  }
  const { data, error } = await input.supabase.from("annabelle_editorial_records").insert({
    manuscript_id: input.manuscriptId, chapter_id: input.chapterId ?? null,
    user_id: input.userId, project_id: input.projectId, record_type: input.recordType,
    subject: input.subject ?? null, content: input.content, confidence: input.confidence,
    epistemic_status: input.epistemicStatus, source_locator: input.sourceLocator ?? {},
    source_sha256: input.sourceSha256 ?? null, supersedes_id: input.supersedesId ?? null,
  }).select("*").single();
  if (error) throw error; return data;
}

export async function listEditorialState(input: {
  supabase: SupabaseClient; projectId: string; manuscriptId: string;
  chapterNumber?: number; recordTypes?: EditorialRecordType[]; subject?: string;
}) {
  let chapters = input.supabase.from("annabelle_chapters").select("*")
    .eq("project_id", input.projectId).eq("manuscript_id", input.manuscriptId)
    .order("chapter_number");
  if (input.chapterNumber) chapters = chapters.eq("chapter_number", input.chapterNumber);
  const chapterResult = await chapters; if (chapterResult.error) throw chapterResult.error;
  const chapterIds = (chapterResult.data ?? []).map((x: any) => x.id);
  let records = input.supabase.from("annabelle_editorial_records").select("*")
    .eq("project_id", input.projectId).eq("manuscript_id", input.manuscriptId)
    .order("created_at");
  if (input.chapterNumber) {
    if (!chapterIds.length) return { chapters: [], records: [], checkpoints: [] };
    records = records.in("chapter_id", chapterIds);
  }
  if (input.recordTypes?.length) records = records.in("record_type", input.recordTypes);
  if (input.subject) records = records.eq("subject", input.subject);
  const [recordResult, checkpointResult] = await Promise.all([
    records,
    input.supabase.from("annabelle_editorial_checkpoints").select("*")
      .eq("project_id", input.projectId).eq("manuscript_id", input.manuscriptId),
  ]);
  if (recordResult.error) throw recordResult.error;
  if (checkpointResult.error) throw checkpointResult.error;
  return { chapters: chapterResult.data ?? [], records: recordResult.data ?? [], checkpoints: checkpointResult.data ?? [] };
}

export async function saveEditorialCheckpoint(input: {
  supabase: SupabaseClient; userId: string; projectId: string; manuscriptId: string;
  passType: "diagnostic"|"continuous"|"editing"|"proof"|"voice_integrity";
  chapterNumber: number; status: "ready"|"in_progress"|"checkpointed"|"complete"|"blocked";
  state?: Record<string, unknown>;
}) {
  const { data, error } = await input.supabase.from("annabelle_editorial_checkpoints").upsert({
    user_id: input.userId, project_id: input.projectId, manuscript_id: input.manuscriptId,
    pass_type: input.passType, chapter_number: input.chapterNumber, status: input.status,
    state: input.state ?? {}, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,project_id,manuscript_id,pass_type" }).select("*").single();
  if (error) throw error; return data;
}
