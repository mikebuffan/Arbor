import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeEpisode } from "./summarizeEpisode";

export async function summarizePriorOpenEpisodes(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  currentEpisodeId: string | null;
  maxEpisodes?: number;
}) {
  const maxEpisodes = Math.max(
    0,
    Math.min(params.maxEpisodes ?? 2, 4),
  );
  if (maxEpisodes === 0) return { summarized: 0 };

  let query = params.supabase
    .from("episodes")
    .select("id,thread_id,opened_at")
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(maxEpisodes + 4);

  if (params.currentEpisodeId) {
    query = query.neq("id", params.currentEpisodeId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let summarized = 0;
  for (const episode of data ?? []) {
    if (summarized >= maxEpisodes) break;

    try {
      await summarizeEpisode({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        episodeId: String(episode.id),
      });
      summarized += 1;
    } catch (error) {
      console.warn("[episodes] background summary failed", {
        episodeId: String(episode.id),
        code:
          error instanceof Error
            ? error.message.slice(0, 80)
            : "episode_summary_failed",
      });
    }
  }

  return { summarized };
}
