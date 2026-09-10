import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

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

  if (error) {
    if (isMissingRuntimeTable(error)) return DEFAULT_STATE;
    throw error;
  }
  if (!data) return DEFAULT_STATE;

  return {
    activeSubsystem:
      (data.active_subsystem as ArborSubsystem | null) ?? "arbor",
    voiceId: String(data.voice_id ?? DEFAULT_STATE.voiceId),
    acousticCorrections: toCorrections(data.acoustic_corrections),
  };
}

async function upsertState(
  input: {
    supabase: SupabaseClient;
    userId: string;
    projectId: string;
  },
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await input.supabase
    .from("arbor_runtime_state")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

export async function persistActiveSubsystem(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  activeSubsystem: ArborSubsystem;
}): Promise<void> {
  await upsertState(input, {
    active_subsystem: input.activeSubsystem,
  });
}

export async function persistVoiceId(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  voiceId: string;
}): Promise<void> {
  const voiceId = input.voiceId.trim();
  if (!voiceId) throw new Error("voice_id_required");

  await upsertState(input, {
    voice_id: voiceId,
  });
}

export async function appendAcousticCorrection(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  correction: string;
}): Promise<void> {
  const correction = input.correction.trim();
  if (!correction) return;

  const current = await loadSubsystemState(input);
  const next = [...current.acousticCorrections, correction].slice(-20);

  await upsertState(input, {
    acoustic_corrections: next,
  });
}

export async function replaceAcousticCorrections(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  corrections: string[];
}): Promise<void> {
  const corrections = input.corrections
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-20);

  await upsertState(input, {
    acoustic_corrections: corrections,
  });
}
