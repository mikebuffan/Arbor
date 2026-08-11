import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export const ATTACHMENT_BUCKET = "chat-attachments";

export type ScopedAttachmentMetadata = {
  id: string;
  user_id: string;
  project_id: string;
  conversation_id: string;
  storage_bucket: string;
  storage_path: string;
  status: string;
};

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
  const filename =
    typeof storagePath === "string" && storagePath.startsWith(prefix)
      ? storagePath.slice(prefix.length)
      : "";
  if (
    typeof storageBucket !== "string" ||
    storageBucket !== ATTACHMENT_BUCKET ||
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\")
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
  try {
    await assertAttachmentWriteScope({
      supabase,
      userId,
      projectId,
      conversationId,
    });
  } catch (error: unknown) {
    if (error instanceof RouteAccessError && error.status === 404) {
      throw new RouteAccessError(404, "attachment_not_found");
    }
    throw error;
  }

  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      "id,user_id,project_id,conversation_id,storage_bucket,storage_path,status",
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
  return data as ScopedAttachmentMetadata;
}
