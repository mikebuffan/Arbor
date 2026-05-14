export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

export type AttachmentKind = "image" | "file";

export function attachmentKindFromMime(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  return "file";
}

export function assertAllowedAttachment({
  mimeType,
  sizeBytes,
}: {
  mimeType: string;
  sizeBytes: number;
}) {
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported attachment type: ${mimeType}`);
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Attachment size must be greater than zero");
  }

  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment exceeds 10 MB limit");
  }
}

export function sanitizeFilename(filename: string): string {
  const trimmed = (filename || "attachment").trim();
  const withoutPath = trimmed.split(/[\\/]/).pop() || "attachment";
  const safe = withoutPath
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 96);

  return safe || "attachment";
}

export function timestampPrefix(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildAttachmentStoragePath({
  userId,
  projectId,
  conversationId,
  attachmentId,
  safeFilename,
}: {
  userId: string;
  projectId: string;
  conversationId: string;
  attachmentId: string;
  safeFilename: string;
}) {
  return [
    userId,
    projectId,
    conversationId,
    attachmentId,
    `${timestampPrefix()}-${safeFilename}`,
  ].join("/");
}

export function assertStoragePathOwnedByAttachment({
  userId,
  projectId,
  conversationId,
  attachmentId,
  storagePath,
}: {
  userId: string;
  projectId: string;
  conversationId: string;
  attachmentId: string;
  storagePath: string;
}) {
  const prefix = `${userId}/${projectId}/${conversationId}/${attachmentId}/`;
  if (!storagePath.startsWith(prefix)) {
    throw new Error("Attachment storage path does not match approved ownership scope");
  }
}

export async function storageObjectExists({
  supabase,
  bucket,
  path,
}: {
  supabase: any;
  bucket: string;
  path: string;
}) {
  const parts = path.split("/");
  const filename = parts.pop();
  const folder = parts.join("/");

  if (!filename || !folder) return false;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    search: filename,
  });

  if (error) throw error;
  return (data ?? []).some((entry: any) => entry.name === filename);
}

export function renderAttachmentNoteForPrompt(rows: Array<{
  id: string;
  original_filename?: string | null;
  mime_type?: string | null;
  attachment_kind?: string | null;
  size_bytes?: number | null;
}>) {
  if (!rows.length) return "";

  const lines = rows.map((row) => {
    const name = row.original_filename || "attachment";
    const type = row.mime_type || row.attachment_kind || "unknown";
    const size = typeof row.size_bytes === "number" ? `, ${row.size_bytes} bytes` : "";
    return `- ${name} (${type}${size})`;
  });

  return [
    "[ATTACHMENT CONTEXT]",
    "The user attached the following file metadata. Do not claim to have read or analyzed file contents unless extraction has been explicitly performed.",
    ...lines,
  ].join("\n");
}
