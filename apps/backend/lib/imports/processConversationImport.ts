import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedTexts } from "@/lib/memory/embeddings";

const DEFAULT_BATCH_SIZE = 64;

type ImportChunk = {
  id: string;
  import_id: string;
  user_id: string;
  project_id: string | null;
  thread_index: number;
  message_index: number;
  source_thread_id: string | null;
  source_message_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string | null;
};

function sourceThreadId(chunk: ImportChunk) {
  return (
    chunk.source_thread_id ??
    `${chunk.import_id}:${chunk.thread_index}`
  );
}

function sourceMessageId(chunk: ImportChunk) {
  return (
    chunk.source_message_id ??
    `${chunk.import_id}:${chunk.thread_index}:${chunk.message_index}`
  );
}

export async function processConversationImportBatch(params?: {
  batchSize?: number;
}) {
  const admin = supabaseAdmin();
  const batchSize = Math.max(
    1,
    Math.min(params?.batchSize ?? DEFAULT_BATCH_SIZE, 96),
  );

  const { data: pendingJob, error: jobReadError } =
    await admin
      .from("system_jobs")
      .select("id,type,status,payload,created_at,retry_count")
      .eq("type", "import_conversations")
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

  if (jobReadError) throw jobReadError;
  if (!pendingJob) {
    return {
      status: "idle" as const,
      processed: 0,
      remaining: 0,
    };
  }

  const importId =
    typeof pendingJob.payload?.importId === "string"
      ? pendingJob.payload.importId
      : null;

  if (!importId) {
    await admin
      .from("system_jobs")
      .update({
        status: "failed",
        error_message: "missing_import_id",
        completed_at: new Date().toISOString(),
      })
      .eq("id", pendingJob.id);

    return {
      status: "failed" as const,
      processed: 0,
      remaining: 0,
    };
  }

  if (pendingJob.status === "pending") {
    await admin
      .from("system_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", pendingJob.id)
      .eq("status", "pending");
  }

  const { data: importRow, error: importError } =
    await admin
      .from("conversation_imports")
      .select("id,user_id,project_id,status")
      .eq("id", importId)
      .maybeSingle();

  if (importError) throw importError;
  if (!importRow?.project_id) {
    await admin
      .from("system_jobs")
      .update({
        status: "failed",
        error_message: "import_requires_project",
        completed_at: new Date().toISOString(),
      })
      .eq("id", pendingJob.id);

    return {
      status: "failed" as const,
      processed: 0,
      remaining: 0,
    };
  }

  await admin
    .from("conversation_imports")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", importId);

  const { data: chunks, error: chunkError } =
    await admin
      .from("conversation_import_chunks")
      .select(
        "id,import_id,user_id,project_id,thread_index,message_index,source_thread_id,source_message_id,role,content,created_at",
      )
      .eq("import_id", importId)
      .eq("status", "pending")
      .order("thread_index", { ascending: true })
      .order("message_index", { ascending: true })
      .limit(batchSize);

  if (chunkError) throw chunkError;

  const batch = (chunks ?? []) as ImportChunk[];

  if (!batch.length) {
    const completedAt = new Date().toISOString();

    await admin
      .from("conversation_imports")
      .update({
        status: "completed",
        updated_at: completedAt,
      })
      .eq("id", importId);

    await admin
      .from("system_jobs")
      .update({
        status: "completed",
        completed_at: completedAt,
        error_message: null,
        last_error: null,
      })
      .eq("id", pendingJob.id);

    return {
      status: "completed" as const,
      processed: 0,
      remaining: 0,
      importId,
    };
  }

  try {
    const embeddings = await embedTexts(
      batch.map((chunk) =>
        [
          `role:${chunk.role}`,
          chunk.created_at ? `time:${chunk.created_at}` : "",
          chunk.content,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );

    const rows = batch.map((chunk, index) => ({
      user_id: chunk.user_id,
      project_id: importRow.project_id,
      source: "chatgpt",
      source_thread_id: sourceThreadId(chunk),
      source_message_id: sourceMessageId(chunk),
      source_message_index: chunk.message_index,
      role: chunk.role,
      content: chunk.content,
      occurred_at: chunk.created_at,
      embedding: embeddings[index],
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await admin
      .from("historical_conversation_turns")
      .upsert(rows, {
        onConflict:
          "user_id,project_id,source,source_message_id",
      });

    if (upsertError) throw upsertError;

    const ids = batch.map((chunk) => chunk.id);

    const { error: markError } = await admin
      .from("conversation_import_chunks")
      .update({
        status: "completed",
        error: null,
      })
      .in("id", ids);

    if (markError) throw markError;

    const { count: remaining, error: countError } =
      await admin
        .from("conversation_import_chunks")
        .select("id", { count: "exact", head: true })
        .eq("import_id", importId)
        .eq("status", "pending");

    if (countError) throw countError;

    const left = remaining ?? 0;

    if (left === 0) {
      const completedAt = new Date().toISOString();

      await admin
        .from("conversation_imports")
        .update({
          status: "completed",
          updated_at: completedAt,
        })
        .eq("id", importId);

      await admin
        .from("system_jobs")
        .update({
          status: "completed",
          completed_at: completedAt,
          error_message: null,
          last_error: null,
        })
        .eq("id", pendingJob.id);
    }

    return {
      status: left === 0 ? ("completed" as const) : ("processing" as const),
      processed: batch.length,
      remaining: left,
      importId,
    };
  } catch (error: any) {
    const message =
      error instanceof Error
        ? error.message
        : String(error ?? "import_batch_failed");

    await admin
      .from("system_jobs")
      .update({
        status: "pending",
        last_error: message,
        retry_count: (pendingJob.retry_count ?? 0) + 1,
        next_run_at: new Date(
          Date.now() + 60_000,
        ).toISOString(),
      })
      .eq("id", pendingJob.id);

    await admin
      .from("conversation_imports")
      .update({
        status: "queued",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", importId);

    throw error;
  }
}
