import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborRuntimeState } from "./runtimeState";

type RuntimeRow = {
  user_id: string;
  project_id: string;
  conversation_id: string;
  state: ArborRuntimeState;
  updated_at: string;
};

export async function loadRuntimeState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
}): Promise<ArborRuntimeState | null> {
  const { data, error } = await input.supabase
    .from("arbor_conversation_state")
    .select("user_id,project_id,conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("conversation_id", input.conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return (data as RuntimeRow).state;
}

export async function saveRuntimeState(input: {
  supabase: SupabaseClient;
  state: ArborRuntimeState;
}): Promise<void> {
  const state = input.state;

  const { error } = await input.supabase
    .from("arbor_conversation_state")
    .upsert(
      {
        user_id: state.userId,
        project_id: state.projectId,
        conversation_id: state.conversationId,
        state,
        updated_at: state.updatedAt,
      },
      {
        onConflict: "user_id,project_id,conversation_id",
      },
    );

  if (error) throw error;
}
