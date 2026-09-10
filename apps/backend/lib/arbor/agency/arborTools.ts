import type { SupabaseClient } from "@supabase/supabase-js";
import { AgencyToolRegistry } from "./tools";
import {
  loadSubsystemState,
  appendAcousticCorrection,
  persistVoiceId,
} from "@/lib/arbor/subsystem/state";
import {
  loadAnnabelleWorkspace,
  persistAnnabelleWorkspace,
  type AnnabelleWorkspace,
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
      name: "annabelle_replace_workspace",
      description:
        "Replace Annabelle's project-level workspace after the user has established or corrected canon/scene state. This is reversible project state, not manuscript publication.",
      risk: "reversible_write",
      parameters: {
        type: "object",
        properties: {
          canon: { type: "array", items: { type: "string" } },
          lockedPassages: { type: "array", items: { type: "string" } },
          sceneState: { type: "array", items: { type: "string" } },
          unresolvedDecisions: { type: "array", items: { type: "string" } },
          workingDelta: { type: ["string", "null"] },
        },
        required: [
          "canon",
          "lockedPassages",
          "sceneState",
          "unresolvedDecisions",
          "workingDelta",
        ],
        additionalProperties: false,
      },
      async execute(args, context) {
        const workspace: AnnabelleWorkspace = {
          canon: strings(args.canon),
          lockedPassages: strings(args.lockedPassages),
          sceneState: strings(args.sceneState),
          unresolvedDecisions: strings(args.unresolvedDecisions),
          workingDelta: nullableString(args.workingDelta),
        };

        await persistAnnabelleWorkspace({
          supabase: input.supabase,
          userId: context.userId,
          projectId: context.projectId,
          workspace,
        });

        return { saved: true };
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
        "Change Arbor's server-owned TTS base voice only when the user explicitly asks to change/test the base voice. The value must be in the server allowlist.",
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
