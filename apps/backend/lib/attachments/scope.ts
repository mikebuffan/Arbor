import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const ATTACHMENT_BUCKET = "chat-attachments";

export async function assertAttachmentWriteScope(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
}) {
  const { supabase, userId, projectId, conversationId } = params;
  await assertProjectOwnedByUser(supabase, userId, projectId);
  await assertConversationOwnedByUser({
    supabase,
    userId,
    projectId,
    conversationId,
  });
}

export function assertProjectAttachmentPath(params: {
  storageBucket: string;
  storagePath: string;
  userId: string;
  projectId: string;
  conversationId: string;
  attachmentId: string;
}): void {
  const {
    storageBucket,
    storagePath,
    userId,
    projectId,
    conversationId,
    attachmentId,
  } = params;
  const prefix = `${userId}/${projectId}/${conversationId}/${attachmentId}/`;
  if (
    storageBucket !== ATTACHMENT_BUCKET ||
    !storagePath.startsWith(prefix) ||
    storagePath.length === prefix.length ||
    storagePath.includes("..") ||
    storagePath.includes("\\")
  ) {
    throw new RouteAccessError(404, "attachment_not_found");
  }
}

export async function assertAttachmentOwnedByScope(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  attachmentId: string;
}) {
  const { supabase, userId, projectId, conversationId, attachmentId } = params;
  await assertAttachmentWriteScope({
    supabase,
    userId,
    projectId,
    conversationId,
  });

  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      "id,user_id,project_id,conversation_id,storage_bucket,storage_path",
    )
    .eq("id", attachmentId)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new RouteAccessError(404, "attachment_not_found");

  assertProjectAttachmentPath({
    storageBucket: data.storage_bucket as string,
    storagePath: data.storage_path as string,
    userId,
    projectId,
    conversationId,
    attachmentId,
  });
  return data;
}
