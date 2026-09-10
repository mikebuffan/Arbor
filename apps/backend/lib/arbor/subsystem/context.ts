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
import type { ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";
import { strategyContext } from "@/lib/arbor/agency/strategyRetention";

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

export async function buildArborInjectedContext(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  userText: string;
}): Promise<ArborInjectedContext> {
  const state = await loadSubsystemState(input);
  const cue = resolveSubsystemCue(input.userText);
  const activeSubsystem = cue ?? state.activeSubsystem;

  if (cue && cue !== state.activeSubsystem) {
    await persistActiveSubsystem({
      supabase: input.supabase,
      userId: input.userId,
      projectId: input.projectId,
      activeSubsystem: cue,
    });
  }

  const agency = await loadAgencyState(input);

  const strategy = agency
    ? strategyContext(agency.strategyNotes)
    : { retained: [], pending: [] };

  const agencyBlock = agency
    ? `
LONGITUDINAL AGENCY STATE:
- goal: ${agency.goal}
- status: ${agency.status}
- current step: ${agency.currentStep}
- unresolved work:
${agency.unresolvedWork.map((item) => `  - ${item}`).join("\n") || "  - none"}
- recurring weaknesses:
${agency.recurringWeaknesses.map((item) => `  - ${item}`).join("\n") || "  - none"}
- retained strategy changes:
${strategy.retained.map((item) => `  - ${item}`).join("\n") || "  - none"}
- tentative strategy under verification:
${strategy.pending.map((item) => `  - ${item}`).join("\n") || "  - none"}
`.trim()
    : "";

  const annabelleWorkspaceBlock =
    activeSubsystem === "annabelle"
      ? annabelleWorkspaceToPromptBlock(
          await loadAnnabelleWorkspace({
            supabase: input.supabase,
            userId: input.userId,
            projectId: input.projectId,
          }),
        )
      : "";

  return {
    activeSubsystem,
    voiceId: state.voiceId,
    acousticCorrections: state.acousticCorrections,
    systemInjection: [
      CORE_RULES,
      activeSubsystem === "annabelle" ? ANNABELLE_RULES : ARBOR_RULES,
      annabelleWorkspaceBlock,
      agencyBlock,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
