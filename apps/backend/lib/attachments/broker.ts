import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAttachmentOwnedByScope } from "@/lib/attachments/scope";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60;

type BrokerOperation = "access" | "delete";
type BrokerFailureStage =
  | "signed_url_create"
  | "storage_preflight"
  | "storage_remove"
  | "storage_verify"
  | "metadata_soft_delete";

function reportBrokerFailure(
  operation: BrokerOperation,
  stage: BrokerFailureStage,
): void {
  console.warn("attachment_broker_failure", { operation, stage });
}

function brokerFailure(
  operation: BrokerOperation,
  stage: BrokerFailureStage,
): RouteAccessError {
  reportBrokerFailure(operation, stage);
  return new RouteAccessError(500, "server_error");
}

type AttachmentScope = {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  attachmentId: string;
};

export async function createAttachmentAccess(
  scope: AttachmentScope,
): Promise<{ signedUrl: string; expiresAt: string }> {
  const attachment = await assertAttachmentOwnedByScope(scope);
  if (attachment.status !== "uploaded") {
    throw new RouteAccessError(404, "attachment_not_found");
  }

  const expiresAt = new Date(
    Date.now() + ATTACHMENT_SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();
  const storage = supabaseAdmin().storage.from(attachment.storage_bucket);
  const { data, error } = await storage.createSignedUrl(
    attachment.storage_path,
    ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  );

  if (error || !data?.signedUrl) {
    throw brokerFailure("access", "signed_url_create");
  }

  return {
    signedUrl: data.signedUrl,
    expiresAt,
  };
}

export async function deleteAttachment(
  scope: AttachmentScope & { reason?: string },
): Promise<void> {
  const attachment = await assertAttachmentOwnedByScope(scope);
  if (attachment.status !== "uploaded" && attachment.status !== "failed") {
    throw new RouteAccessError(404, "attachment_not_found");
  }

  const storage = supabaseAdmin().storage.from(attachment.storage_bucket);
  const preflight = await storage.exists(attachment.storage_path);
  if (preflight.error) {
    throw brokerFailure("delete", "storage_preflight");
  }

  if (preflight.data) {
    const removal = await storage.remove([attachment.storage_path]);
    if (removal.error) {
      throw brokerFailure("delete", "storage_remove");
    }
  }

  const verification = await storage.exists(attachment.storage_path);
  if (verification.error || verification.data) {
    throw brokerFailure("delete", "storage_verify");
  }

  const { count, error } = await scope.supabase
    .from("chat_attachments")
    .update(
      {
        status: "deleted",
        deleted_at: new Date().toISOString(),
        delete_reason: scope.reason ?? "user_deleted",
      },
      { count: "exact" },
    )
    .eq("id", scope.attachmentId)
    .eq("user_id", scope.userId)
    .eq("project_id", scope.projectId)
    .eq("conversation_id", scope.conversationId)
    .eq("status", attachment.status)
    .is("deleted_at", null);

  if (error || count !== 1) {
    throw brokerFailure("delete", "metadata_soft_delete");
  }
}
