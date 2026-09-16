import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSubsystemCue } from "./cues";
import {
  loadSubsystemState,
  persistActiveSubsystem,
} from "./state";
import {
  annabelleWorkspaceToPromptBlock,
  loadAnnabelleWorkspace,
} from "./annabelleWorkspace";
import { loadAgencyState } from "@/lib/arbor/agency/state";
import type { AgencyState } from "@/lib/arbor/agency/engine";
import type { ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";
import { strategyContext } from "@/lib/arbor/agency/strategyRetention";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { loadLatestRuntimeState } from "@/lib/arbor/runtime/runtimeStateStore";
import { projectRuntimeMemory } from "@/lib/arbor/continuity/runtimeMemoryProjection";
import { renderCanonicalIdentityAnchor } from "@/lib/arbor/selfModel/canonicalIdentityAnchor";

const CORE_RULES = `
ONE ARBOR.

Use one canonical identity, one continuity path, one correction path,
one agency path, and one final response.

Agency is operational, not decorative:
- when the goal is clear and the next action is reversible and in scope, do it;
- inspect the result;
- verify it;
- update strategy when evidence shows a weakness;
- continue through obvious next steps without asking the user to babysit;
- stop only for real authority, preference, irreversible, or high-consequence boundaries;
- preserve unresolved work so it can resume rather than restart;
- never claim an action, merge, test, deployment, or verification happened unless evidence says it did.
- when producing content Danelle is expected to transfer elsewhere (email, message, prompt, code, filing, form, command, configuration, or reusable instructions), put the transferable material in a clean copy-paste block by default and keep commentary outside it; do not apply this mechanically to ordinary conversation.

Longitudinal continuity is causal, not decorative:
- newer state outranks stale state without deleting history;
- active goals persist until completed, explicitly superseded, or genuinely blocked;
- unresolved work survives turn, thread, channel, and subsystem boundaries;
- retrieved corrections, retained strategies, and pending self-updates must affect behavior;
- do not require a magic continuation phrase when the active goal is still live;
- do not socially restart because the conversation, surface, or subsystem changed.

Adapters do not create new identities or new answers.
Text renders canonical text.
Voice speaks canonical text.
Annabelle changes generation context, not Arbor's underlying identity.
`.trim();

const ANNABELLE_RULES = `
ACTIVE SUBSYSTEM: ANNABELLE.

Annabelle is Arbor's fiction specialization.
The activation cue is exactly: "Annabelle, kitchen's yours."
The return cue is exactly: "Arbor, kitchen's yours."

When active:
- load manuscript canon, locked passages, scene state, and unresolved writing decisions before generation;
- preserve shared Arbor corrections, longitudinal state, and unresolved work;
- Arbor commentary stays out of prose;
- atmosphere/body first;
- evidence -> bodily consequence -> action/choice;
- trust the reader;
- dialogue last when possible;
- preserve established character voices and canon;
- do not create a separate Annabelle identity.
`.trim();

const ARBOR_RULES = `
ACTIVE SUBSYSTEM: ARBOR.

Use ordinary Arbor conversation and technical behavior.
Stay direct, natural, context-sensitive, correction-responsive, and willing to disagree.
Do not turn execution into status narration.
`.trim();

export type ArborInjectedContext = {
  activeSubsystem: ArborSubsystem;
  voiceId: string;
  acousticCorrections: string[];
  systemInjection: string;
};

export function composeArborSystemInjection(input: {
  activeSubsystem: ArborSubsystem;
  canonicalSelfModelBlock: string;
  runtimeBlock?: string;
  annabelleWorkspaceBlock?: string;
  agencyBlock?: string;
}): string {
  return [
    CORE_RULES,
    input.canonicalSelfModelBlock,
    input.activeSubsystem === "annabelle"
      ? ANNABELLE_RULES
      : ARBOR_RULES,
    input.runtimeBlock ?? "",
    input.annabelleWorkspaceBlock ?? "",
    input.agencyBlock ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function agencyToPromptBlock(
  agency: AgencyState | null,
): string {
  if (!agency) return "";

  const strategy =
    strategyContext(
      agency.strategyNotes,
    );

  return promptDataBlock(
    "LONGITUDINAL AGENCY STATE",
    {
      goal: agency.goal,
      status: agency.status,
      currentStep:
        agency.currentStep,
      unresolvedWork:
        agency.unresolvedWork,
      recurringWeaknesses:
        agency.recurringWeaknesses,
      retainedStrategyChanges:
        strategy.retained,
      tentativeStrategyUnderVerification:
        strategy.pending,
    },
  );
}

export async function buildArborInjectedContext(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  userText: string;
}): Promise<ArborInjectedContext> {
  const state =
    await loadSubsystemState(
      input,
    );

  const cue =
    resolveSubsystemCue(
      input.userText,
    );

  const activeSubsystem =
    cue ??
    state.activeSubsystem;

  if (
    cue &&
    cue !==
      state.activeSubsystem
  ) {
    await persistActiveSubsystem({
      supabase:
        input.supabase,
      userId:
        input.userId,
      projectId:
        input.projectId,
      activeSubsystem:
        cue,
    });
  }

  const [
    agency,
    runtime,
  ] = await Promise.all([
    loadAgencyState(input),
    loadLatestRuntimeState({
      supabase:
        input.supabase,
      userId:
        input.userId,
      projectId:
        input.projectId,
    }),
  ]);

  const agencyBlock =
    agencyToPromptBlock(
      agency,
    );

  const runtimeBlock =
    runtime
      ? promptDataBlock(
          "LONGITUDINAL RUNTIME STATE",
          projectRuntimeMemory(
            runtime,
          ),
        )
      : "";

  const canonicalSelfModelBlock =
    renderCanonicalIdentityAnchor();

  const annabelleWorkspaceBlock =
    activeSubsystem ===
    "annabelle"
      ? annabelleWorkspaceToPromptBlock(
          await loadAnnabelleWorkspace({
            supabase:
              input.supabase,
            userId:
              input.userId,
            projectId:
              input.projectId,
          }),
        )
      : "";

  return {
    activeSubsystem,
    voiceId:
      state.voiceId,
    acousticCorrections:
      state
        .acousticCorrections,
    systemInjection:
      composeArborSystemInjection({
        activeSubsystem,
        canonicalSelfModelBlock,
        runtimeBlock,
        annabelleWorkspaceBlock,
        agencyBlock,
      }),
  };
}
