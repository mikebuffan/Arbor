import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export async function assertProjectOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new RouteAccessError(404, "project_not_found");
  }
}

export async function assertConversationOwnedByUser(params: {
  supabase: SupabaseClient;
  userId: string;
  conversationId: string;
  projectId?: string | null;
}): Promise<void> {
  const { supabase, userId, conversationId, projectId } = params;
  let query = supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new RouteAccessError(404, "conversation_not_found");
  }
}
