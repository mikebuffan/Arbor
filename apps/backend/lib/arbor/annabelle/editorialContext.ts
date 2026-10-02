import type { SupabaseClient } from "@supabase/supabase-js";
import { promptDataBlock } from "../promptData";

const RECORD_LIMIT = 200;
const CONTEXT_CHAR_LIMIT = 30000;
const types = ["editor_note", "voice_evidence", "gold_exemplar", "canon", "decision", "do_not_touch",
  "character_state", "relationship_state", "knowledge_state", "timeline", "physicality", "location", "injury_recovery", "contradiction"];
type Row = Record<string, unknown>;
export type EditorialContext = {
  status: "ready" | "unavailable" | "no_canonical" | "ambiguous" | "incomplete";
  manuscript: { id: string; title: string; sourceSha256: string } | null;
  chapterNumber: number | null;
  records: Row[];
  warnings: string[];
};

function empty(status: EditorialContext["status"], warning: string): EditorialContext {
  return { status, manuscript: null, chapterNumber: null, records: [], warnings: [warning] };
}
function missing(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "PGRST205";
}
function assertScope(row: Row, scope: { userId: string; projectId: string }, manuscriptId?: string) {
  if (row.user_id !== scope.userId || row.project_id !== scope.projectId ||
      (manuscriptId && row.manuscript_id !== manuscriptId)) throw new Error("annabelle_editorial_context_scope_mismatch");
}

// Only an unambiguous explicit chapter mention selects chapter-specific state.
export function chapterNumberFromRequest(text: string): number | null {
  const words = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const mentions = [...text.matchAll(/\bchapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi)]
    .map(match => /^\d+$/.test(match[1]) ? Number(match[1]) : words.indexOf(match[1].toLowerCase()) + 1);
  const unique = [...new Set(mentions)];
  return unique.length === 1 && Number.isSafeInteger(unique[0]) && unique[0] > 0 ? unique[0] : null;
}

export async function loadEditorialContext(input: {
  supabase: SupabaseClient; userId: string; projectId: string; chapterNumber?: number | null;
}): Promise<EditorialContext> {
  const manuscripts = await input.supabase.from("annabelle_manuscripts")
    .select("id,user_id,project_id,title,source_sha256,status")
    .eq("user_id", input.userId).eq("project_id", input.projectId).eq("status", "canonical").limit(2);
  if (manuscripts.error) {
    if (missing(manuscripts.error)) return empty("unavailable", "Editorial storage is unavailable; use the legacy workspace without claiming calibration was loaded.");
    throw manuscripts.error;
  }
  const candidates = (manuscripts.data ?? []) as Row[];
  for (const row of candidates) {
    assertScope(row, input);
    if (row.status !== "canonical") throw new Error("annabelle_editorial_context_selection_mismatch");
  }
  if (!candidates.length) return empty("no_canonical", "No canonical manuscript is selected; do not guess a reference draft.");
  if (candidates.length !== 1) return empty("ambiguous", "Multiple canonical manuscripts exist; editorial evidence was not selected.");
  const manuscript = candidates[0];
  if (typeof manuscript.id !== "string" || typeof manuscript.source_sha256 !== "string" || !manuscript.source_sha256)
    throw new Error("annabelle_editorial_context_invalid_manuscript");

  let chapterId: string | null = null;
  let chapterHash: string | null = null;
  const chapterNumber = input.chapterNumber ?? null;
  if (chapterNumber !== null) {
    if (!Number.isSafeInteger(chapterNumber) || chapterNumber <= 0) throw new Error("annabelle_editorial_context_invalid_chapter");
    const chapters = await input.supabase.from("annabelle_chapters")
      .select("id,user_id,project_id,manuscript_id,chapter_number,source_sha256")
      .eq("user_id", input.userId).eq("project_id", input.projectId).eq("manuscript_id", manuscript.id)
      .eq("chapter_number", chapterNumber).limit(2);
    if (chapters.error) {
      if (missing(chapters.error)) return empty("unavailable", "Chapter storage is unavailable; no chapter evidence was loaded.");
      throw chapters.error;
    }
    const rows = (chapters.data ?? []) as Row[];
    rows.forEach(row => assertScope(row, input, String(manuscript.id)));
    if (rows.length !== 1 || rows[0].chapter_number !== chapterNumber)
      return empty("incomplete", "Requested chapter is missing or ambiguous; do not substitute another chapter.");
    if (typeof rows[0].id !== "string" || typeof rows[0].source_sha256 !== "string" || !rows[0].source_sha256)
      throw new Error("annabelle_editorial_context_invalid_chapter_source");
    chapterId = rows[0].id;
    chapterHash = rows[0].source_sha256;
  }

  // Read the full bounded manuscript record window before selecting a chapter,
  // so supersession across chapter/global scope cannot revive an old record.
  const result = await input.supabase.from("annabelle_editorial_records")
    .select("id,user_id,project_id,manuscript_id,chapter_id,record_type,subject,content,confidence,epistemic_status,source_locator,source_sha256,supersedes_id,created_at")
    .eq("user_id", input.userId).eq("project_id", input.projectId).eq("manuscript_id", manuscript.id)
    .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(RECORD_LIMIT + 1);
  if (result.error) {
    if (missing(result.error)) return empty("unavailable", "Editorial records are unavailable; no evidence was loaded.");
    throw result.error;
  }
  const rows = (result.data ?? []) as Row[];
  rows.forEach(row => assertScope(row, input, String(manuscript.id)));
  if (rows.length > RECORD_LIMIT) return empty("incomplete", "Editorial window exceeds the safe bound; no partial locks or potentially superseded evidence was loaded.");
  const superseded = new Set(rows.map(row => row.supersedes_id).filter(Boolean));
  const warnings: string[] = [];
  const records: Row[] = [];
  for (const row of rows) {
    if (superseded.has(row.id) || row.epistemic_status === "rejected" || !types.includes(String(row.record_type))) continue;
    if (row.chapter_id !== null && row.chapter_id !== chapterId) continue;
    const sourceHash = row.chapter_id === null ? manuscript.source_sha256 : chapterHash;
    const hasSource = row.source_sha256 === sourceHash && row.source_locator &&
      typeof row.source_locator === "object" && Object.keys(row.source_locator).length > 0;
    const sourceEvidence = row.record_type === "voice_evidence" || row.record_type === "gold_exemplar";
    if ((row.source_sha256 && row.source_sha256 !== sourceHash) || (sourceEvidence && !hasSource)) {
      warnings.push(`Record ${String(row.id)} omitted: missing or stale source binding.`); continue;
    }
    const evidenceCount = Number((row.content as Row | null)?.evidenceCount ?? 0);
    if (row.record_type === "voice_evidence" && row.epistemic_status === "confirmed" &&
        (!Number.isSafeInteger(evidenceCount) || evidenceCount < 2)) {
      warnings.push(`Record ${String(row.id)} omitted: voice confirmation lacks repeated evidence.`); continue;
    }
    records.push({ id: row.id, chapterId: row.chapter_id, type: row.record_type, subject: row.subject,
      content: row.content, confidence: row.confidence, epistemicStatus: row.epistemic_status,
      sourceLocator: row.source_locator, sourceSha256: row.source_sha256 });
  }
  if (JSON.stringify(records).length > CONTEXT_CHAR_LIMIT)
    return empty("incomplete", "Editorial context exceeds the safe size; no lock or example was silently clipped.");
  return { status: "ready", manuscript: { id: manuscript.id, title: String(manuscript.title), sourceSha256: manuscript.source_sha256 },
    chapterNumber, records, warnings };
}

export function editorialContextToPromptBlock(context: EditorialContext): string {
  return promptDataBlock("ANNABELLE EDITORIAL EVIDENCE", context);
}
