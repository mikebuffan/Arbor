import type { ArborWorkState } from "../agency/workState";

export type ArborContinuityState = {
  currentGoal: string | null;
  lastMeaningfulUserTurn: string | null;
  lastMeaningfulArborTurn: string | null;
  unresolvedWork: Array<{
    id: string;
    title: string;
    status: string;
    nextAction: string | null;
  }>;
  activeCorrections: string[];
  mode: "text" | "voice" | "annabelle";
};

export function buildContinuityState(input: {
  mode: ArborContinuityState["mode"];
  currentGoal?: string | null;
  lastMeaningfulUserTurn?: string | null;
  lastMeaningfulArborTurn?: string | null;
  workItems?: ArborWorkState[];
  activeCorrections?: string[];
}): ArborContinuityState {
  return {
    currentGoal: input.currentGoal?.trim() || null,
    lastMeaningfulUserTurn: input.lastMeaningfulUserTurn?.trim() || null,
    lastMeaningfulArborTurn: input.lastMeaningfulArborTurn?.trim() || null,
    unresolvedWork: (input.workItems ?? [])
      .filter((item) => !["resolved", "reverted"].includes(item.status))
      .map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        nextAction: item.nextAction,
      })),
    activeCorrections: Array.from(
      new Set((input.activeCorrections ?? []).map((x) => x.trim()).filter(Boolean)),
    ),
    mode: input.mode,
  };
}

export function continuityToPromptBlock(state: ArborContinuityState): string {
  const work = state.unresolvedWork.length
    ? state.unresolvedWork
        .map((item) => `- ${item.title} [${item.status}]${item.nextAction ? `: next ${item.nextAction}` : ""}`)
        .join("\n")
    : "- none";

  const corrections = state.activeCorrections.length
    ? state.activeCorrections.map((item) => `- ${item}`).join("\n")
    : "- none";

  return [
    "CONTINUITY STATE",
    `Mode: ${state.mode}`,
    `Current goal: ${state.currentGoal ?? "(unknown)"}`,
    `Last meaningful user turn: ${state.lastMeaningfulUserTurn ?? "(unknown)"}`,
    `Last meaningful Arbor turn: ${state.lastMeaningfulArborTurn ?? "(unknown)"}`,
    "Unresolved work:",
    work,
    "Active corrections:",
    corrections,
  ].join("\n");
}
