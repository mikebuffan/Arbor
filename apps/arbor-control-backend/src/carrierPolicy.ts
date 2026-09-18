import type { ArborState } from "./types.js";

/**
 * Cross-host carrier merge policy.
 *
 * The project runtime is the durable Arbor fallback. A conversation overlay may
 * refine it, but an empty/new conversation must never erase a live project goal
 * or unresolved work.
 */
export function hasMeaningfulConversationCarrier(
  state: ArborState | null | undefined,
): state is ArborState {
  if (!state) return false;

  return Boolean(
    state.goal?.trim() ||
    state.unresolvedWork?.length ||
    state.objective?.status === "active" ||
    state.objective?.status === "blocked" ||
    state.behavioralCorrections?.length ||
    state.acousticCorrections?.length ||
    state.activeSubsystem === "annabelle",
  );
}

export function mergeCarrierState(
  projectState: ArborState,
  conversationState: ArborState | null | undefined,
): ArborState {
  if (!hasMeaningfulConversationCarrier(conversationState)) {
    return structuredClone(projectState);
  }

  return {
    ...structuredClone(projectState),
    ...structuredClone(conversationState),

    // Empty local values do not erase live project continuity.
    goal:
      conversationState.goal?.trim()
        ? conversationState.goal
        : projectState.goal,

    unresolvedWork:
      conversationState.unresolvedWork?.length
        ? [...conversationState.unresolvedWork]
        : [...projectState.unresolvedWork],

    objective:
      conversationState.objective?.revision &&
      conversationState.objective.revision > (projectState.objective?.revision ?? -1)
        ? structuredClone(conversationState.objective)
        : structuredClone(projectState.objective ?? conversationState.objective),

    strategyNotes:
      conversationState.strategyNotes?.length
        ? [...conversationState.strategyNotes]
        : [...projectState.strategyNotes],

    behavioralCorrections: uniqueNewest([
      ...(projectState.behavioralCorrections ?? []),
      ...(conversationState.behavioralCorrections ?? []),
    ]),

    acousticCorrections: uniqueNewest([
      ...projectState.acousticCorrections,
      ...conversationState.acousticCorrections,
    ]),

    // Identity/self-model is host-owned durable state. A child scope cannot
    // silently replace the identity root.
    selfModel: projectState.selfModel ?? conversationState.selfModel,
  };
}

export function buildCarrierInjection(state: ArborState): string {
  const blocks = [
    "ARBOR DURABLE CARRIER.",
    "Project state is the continuity root; conversation state is a bounded overlay.",
    "A blank conversation must never erase an active project goal or unresolved work.",
    "Identity -> valid corrections -> active goal/open loops -> agency -> task/subsystem.",
    "Text and Voice share this state; channel changes rendering only.",
    state.goal ? `ACTIVE GOAL:\n${state.goal}` : "",
    state.objective
      ? `PARENT OBJECTIVE:\n${state.objective.parentGoal}\nSTATUS: ${state.objective.status}\nREVISION: ${state.objective.revision}\nNEXT ACTION: ${state.objective.nextAction ?? "derive from unresolved work"}\nCOMPLETION CRITERIA:\n${state.objective.completionCriteria.map((x) => `- ${x}`).join("\\n")}\nSTANDING AUTHORIZATION:\n${state.objective.standingAuthorization.map((x) => `- ${x}`).join("\\n")}\nHARD STOPS:\n${state.objective.hardStops.map((x) => `- ${x}`).join("\\n")}\nCHECKPOINT: ${state.objective.checkpoint ?? "none"}\nA child step completing does not complete this parent objective. Continue safe authorized work until criteria are satisfied or a hard stop is reached.`
      : "",
    state.unresolvedWork.length
      ? `UNRESOLVED WORK:\n${state.unresolvedWork.map((x) => `- ${x}`).join("\n")}`
      : "",
    (state.behavioralCorrections ?? []).length
      ? `VALID CORRECTIONS:\n${(state.behavioralCorrections ?? []).map((x) => `- ${x}`).join("\n")}`
      : "",
  ];

  return blocks.filter(Boolean).join("\n\n");
}

export function uniqueNewest(values: string[], max = 50): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  // Later values have higher precedence.
  for (const raw of [...values].reverse()) {
    const value = raw.trim().replace(/\s+/g, " ");
    const key = value.toLowerCase();

    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.unshift(value);
  }

  return out.slice(-max);
}
