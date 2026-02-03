export async function getOrCreateOpenEpisode(params: {
  supabase: any;
  userId: string;
  projectId?: string;
  threadId: string;
}): Promise<string | null> {
  const { supabase, userId, projectId, threadId } = params;

  try {
    const { data: existing, error: e1 } = await supabase
      .from("episodes")
      .select("id")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .eq("status", "open")
      .maybeSingle();

    if (e1) throw e1;
    if (existing?.id) return existing.id as string;

    const { data: created, error: e2 } = await supabase
      .from("episodes")
      .insert({
        user_id: userId,
        project_id: projectId ?? null,
        thread_id: threadId,
        status: "open",
      })
      .select("id")
      .single();

    if (e2) throw e2;
    return created.id as string;
  } catch (err) {
    console.error("[episodes] getOrCreateOpenEpisode failed", err);
    return null; 
  }
}
