import type { AgencyState } from "../agency/engine";
import type { ArborSubsystem } from "../runtime/arborRuntime";

export type ArborContinuityState = {
  currentGoal: string | null;
  lastMeaningfulUserTurn: string | null;
  lastMeaningfulArborTurn: string | null;
  unresolvedWork: string[];
  recurringWeaknesses: string[];
  retainedStrategies: string[];
  activeCorrections: string[];
  activeSubsystem: ArborSubsystem;
  channel: "text" | "voice";
};

export function buildContinuityState(input: {
  agency?: AgencyState | null;
  activeSubsystem: ArborSubsystem;
  channel: "text" | "voice";
  lastMeaningfulUserTurn?: string | null;
  lastMeaningfulArborTurn?: string | null;
  activeCorrections?: string[];
}): ArborContinuityState {
  return {
    currentGoal: input.agency?.goal?.trim() || null,
    lastMeaningfulUserTurn: input.lastMeaningfulUserTurn?.trim() || null,
    lastMeaningfulArborTurn: input.lastMeaningfulArborTurn?.trim() || null,
    unresolvedWork: input.agency?.unresolvedWork ?? [],
    recurringWeaknesses: input.agency?.recurringWeaknesses ?? [],
    retainedStrategies: input.agency?.strategyNotes ?? [],
    activeCorrections: Array.from(
      new Set(
        (input.activeCorrections ?? [])
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
    activeSubsystem: input.activeSubsystem,
    channel: input.channel,
  };
}

export function continuityToPromptBlock(state: ArborContinuityState): string {
  const list = (heading: string, values: string[]) =>
    [
      heading,
      values.length
        ? values.map((value) => `- ${value}`).join("\n")
        : "- none",
    ].join("\n");

  return [
    "CONTINUITY STATE",
    `Channel: ${state.channel}`,
    `Active subsystem: ${state.activeSubsystem}`,
    `Current goal: ${state.currentGoal ?? "(unknown)"}`,
    `Last meaningful user turn: ${state.lastMeaningfulUserTurn ?? "(unknown)"}`,
    `Last meaningful Arbor turn: ${state.lastMeaningfulArborTurn ?? "(unknown)"}`,
    list("Unresolved work:", state.unresolvedWork),
    list("Recurring weaknesses:", state.recurringWeaknesses),
    list("Retained strategy changes:", state.retainedStrategies),
    list("Active corrections:", state.activeCorrections),
  ].join("\n");
}
