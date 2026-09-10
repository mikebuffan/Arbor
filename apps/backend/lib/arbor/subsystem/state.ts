import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";

export type ArborSubsystemState = {
  activeSubsystem: ArborSubsystem;
  voiceId: string;
  acousticCorrections: string[];
};

const DEFAULT_STATE: ArborSubsystemState = {
  activeSubsystem: "arbor",
  voiceId: process.env.ARBOR_OPENAI_VOICE ?? "cedar",
  acousticCorrections: [],
};

function toCorrections(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(-20);
}

export async function loadSubsystemState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<ArborSubsystemState> {
  const { data, error } = await input.supabase
    .from("arbor_runtime_state")
    .select("active_subsystem,voice_id,acoustic_corrections")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_STATE;

  return {
    activeSubsystem: (data.active_subsystem as ArborSubsystem | null) ?? "arbor",
    voiceId: String(data.voice_id ?? DEFAULT_STATE.voiceId),
    acousticCorrections: toCorrections(data.acoustic_corrections),
  };
}

export async function persistActiveSubsystem(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  activeSubsystem: ArborSubsystem;
}): Promise<void> {
  const { error } = await input.supabase
    .from("arbor_runtime_state")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        active_subsystem: input.activeSubsystem,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) throw error;
}
