import type { SupabaseClient } from "@supabase/supabase-js";
import { AgencyToolRegistry } from "./tools";
import {
  loadSubsystemState,
  appendAcousticCorrection,
  persistVoiceId,
} from "@/lib/arbor/subsystem/state";
import {
  loadAnnabelleWorkspace,
  restoreLatestAnnabelleWorkspaceRevision,
  updateAnnabelleWorkspace,
} from "@/lib/arbor/subsystem/annabelleWorkspace";
import { allowedArborVoiceIds } from "@/lib/arbor/voice/voiceConfig";

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("agency_tool_invalid_string_array");
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw new Error("agency_tool_invalid_string_array");
    }
    return item;
  });
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("agency_tool_invalid_nullable_string");
  }
  return value;
}

export function buildArborAgencyTools(input: {
  supabase: SupabaseClient;
}): AgencyToolRegistry {
  return new AgencyToolRegistry()
    .register({
      name: "arbor_read_runtime_state",
      description:
        "Read the current server-owned Arbor subsystem, voice, and acoustic correction state for the active project.",
      risk: "read",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      async execute(_args, context) {
        return loadSubsystemState({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
        });
      },
    })
    .register({
      name: "annabelle_read_workspace",
      description:
        "Read Annabelle's project-level canon, locked passages, current scene state, unresolved writing decisions, and latest working delta.",
      risk: "read",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      async execute(_args, context) {
        return loadAnnabelleWorkspace({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
        });
      },
    })
    .register({
      name: "annabelle_set_list_section",
      description:
        "Update one Annabelle list section without touching the others. Use for canon, locked passages, current scene state, or unresolved writing decisions. The prior workspace is revisioned first.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: [
              "canon",
              "lockedPassages",
              "sceneState",
              "unresolvedDecisions",
            ],
          },
          values: {
            type: "array",
            items: { type: "string" },
          },
          reason: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },
        required: ["section", "values", "reason"],
        additionalProperties: false,
      },
      async execute(args, context) {
        const section = String(args.section);
        const values = strings(args.values);
        const reason = String(args.reason);

        const allowed = new Set([
          "canon",
          "lockedPassages",
          "sceneState",
          "unresolvedDecisions",
        ]);

        if (!allowed.has(section)) {
          throw new Error("annabelle_workspace_section_invalid");
        }

        const next = await updateAnnabelleWorkspace(
          {
            supabase: input.supabase,
            userId: context.userId,
            projectId: context.projectId,
            reason,
          },
          (current) => ({
            ...current,
            [section]: values,
          }),
        );

        return { saved: true, section, workspace: next };
      },
    })
    .register({
      name: "annabelle_set_working_delta",
      description:
        "Set Annabelle's latest working delta without changing canon or scene state. The prior workspace is revisioned first.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {
          workingDelta: {
            type: ["string", "null"],
          },
          reason: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },
        required: ["workingDelta", "reason"],
        additionalProperties: false,
      },
      async execute(args, context) {
        const workingDelta = nullableString(args.workingDelta);

        const next = await updateAnnabelleWorkspace(
          {
            supabase: input.supabase,
            userId: context.userId,
            projectId: context.projectId,
            reason: String(args.reason),
          },
          (current) => ({
            ...current,
            workingDelta,
          }),
        );

        return { saved: true, workspace: next };
      },
    })
    .register({
      name: "annabelle_restore_previous_workspace",
      description:
        "Restore Annabelle's most recent saved before-snapshot when a workspace update needs to be rolled back.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      async execute(_args, context) {
        return restoreLatestAnnabelleWorkspaceRevision({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
        });
      },
    })
    .register({
      name: "arbor_append_acoustic_correction",
      description:
        "Persist one explicit user acoustic correction for Arbor Voice, such as accent drift, pacing, timbre, or delivery feedback. Use only when the user actually supplied that correction.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {
          correction: { type: "string", minLength: 1, maxLength: 500 },
        },
        required: ["correction"],
        additionalProperties: false,
      },
      async execute(args, context) {
        if (typeof args.correction !== "string") {
          throw new Error("agency_tool_invalid_correction");
        }

        await appendAcousticCorrection({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
          correction: args.correction,
        });

        return { saved: true };
      },
    })
    .register({
      name: "arbor_set_voice",
      description:
        "Change Arbor's server-owned TTS base voice only when the user explicitly asks to change or test the base voice. The value must be in the server allowlist.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {
          voiceId: {
            type: "string",
            enum: allowedArborVoiceIds(),
          },
        },
        required: ["voiceId"],
        additionalProperties: false,
      },
      async execute(args, context) {
        if (typeof args.voiceId !== "string") {
          throw new Error("agency_tool_invalid_voice");
        }

        await persistVoiceId({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
          voiceId: args.voiceId,
        });

        return { saved: true, voiceId: args.voiceId };
      },
    });
}
