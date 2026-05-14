export async function getOrCreateDefaultProjectId(
  supabase: any,
  userId: string
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Default Project")
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: "Default Project",
      persona_id: "arbor",
      framework_version: "v1",
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id as string;
}

export async function assertProjectOwnedByUser({
  supabase,
  userId,
  projectId,
}: {
  supabase: any;
  userId: string;
  projectId: string;
}) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (error || !data?.id) {
    throw new Error("Project not found or not owned by user");
  }

  return data.id as string;
}

export async function getOrCreateConversation({
  supabase,
  userId,
  projectId,
  conversationId,
}: {
  supabase: any;
  userId: string;
  projectId: string;
  conversationId?: string | null;
}) {
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    if (error || !data?.id) {
      throw new Error("Conversation not found or not owned by user/project");
    }

    return data.id as string;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      project_id: projectId,
      title: null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
