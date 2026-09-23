import type { SupabaseClient } from "@supabase/supabase-js";
import { assertProjectOwnedByUser, assertConversationOwnedByUser } from "@/lib/auth/ownership";
import { assertProjectAttachmentPath } from "@/lib/attachments/scope";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export const GROVE_ATTACHMENT_PAGE_SIZE = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readGroveDocumentQuery(url: URL): {
  projectId: string;
  after: string | null;
} | null {
  const projectId = url.searchParams.get("projectId") ?? "";
  const after = url.searchParams.get("after");
  if (!UUID.test(projectId) || (after !== null && !UUID.test(after))) return null;
  return { projectId, after };
}

type AttachmentRow = {
  id: string;
  user_id: string;
  project_id: string;
  conversation_id: string;
  storage_bucket: string;
  storage_path: string;
  status: string;
};

export type GroveDocumentEntry = {
  id: string;
  projectId: string;
  conversationId: string;
  displayName: string;
};

// Project-wide metadata listing. Does not sign URLs or return storage paths.
/// Both project and each conversation are checked against current user scope.
export async function listGroveDocuments({
  supabase, userId, projectId, after,
}: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  after: string | null;
}): Promise<{
  documents: GroveDocumentEntry[];
  nextCursor: string | null;
}> {
  await assertProjectOwnedByUser(supabase, userId, projectId);
  let query = supabase.from("chat_attachments")
    .select("id,user_id,project_id,conversation_id,storage_bucket,storage_path,status")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("status", "uploaded")
    .is("deleted_at", null)
    .order("id", { ascending: true })
    .limit(GROVE_ATTACHMENT_PAGE_SIZE + 1);
  if (after) query = query.gt("id", after);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as AttachmentRow[];
  const page = rows.slice(0, GROVE_ATTACHMENT_PAGE_SIZE);
  const verifiedConversations = new Set<string>();
  const documents: GroveDocumentEntry[] = [];
  for (const row of page) {
    // Refuse a malformed or cross-scope metadata result even if the database
    // policy changes later. Never send raw object paths to a mobile client.
    if (row.user_id !== userId || row.project_id !== projectId ||
        row.status !== "uploaded" || !UUID.test(row.id) ||
        !UUID.test(row.conversation_id)) {
      throw new RouteAccessError(404, "attachment_not_found");
    }
    if (!verifiedConversations.has(row.conversation_id)) {
      await assertConversationOwnedByUser({
        supabase, userId, projectId, conversationId: row.conversation_id,
      });
      verifiedConversations.add(row.conversation_id);
    }
    assertProjectAttachmentPath({
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      userId, projectId,
      conversationId: row.conversation_id,
      attachmentId: row.id,
    });
    const name = row.storage_path.substring(row.storage_path.lastIndexOf("/") + 1)
      .replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 120);
    documents.push({
      id: row.id,
      projectId,
      conversationId: row.conversation_id,
      displayName: name || "Unnamed attachment",
    });
  }
  return {
    documents,
    nextCursor: rows.length > GROVE_ATTACHMENT_PAGE_SIZE
      ? page[page.length - 1].id
      : null,
  };
}
