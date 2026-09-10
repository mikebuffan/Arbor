import type { ArborState } from "./types.js";

export type AnnabelleWorkspace = {
  canon: string[];
  lockedPassages: string[];
  sceneState: string[];
  unresolvedDecisions: string[];
  workingDelta: string | null;
};

export const EMPTY_ANNABELLE_WORKSPACE: AnnabelleWorkspace = {
  canon: [],
  lockedPassages: [],
  sceneState: [],
  unresolvedDecisions: [],
  workingDelta: null,
};

export function annabelleWorkspace(
  state: ArborState,
): AnnabelleWorkspace {
  return state.annabelle ?? {
    ...EMPTY_ANNABELLE_WORKSPACE,
  };
}

export function renderAnnabelleWorkspace(
  state: ArborState,
): string {
  const workspace = annabelleWorkspace(state);

  const list = (name: string, values: string[]) =>
    [
      `${name}:`,
      values.length
        ? values.map((value) => `- ${value}`).join("\n")
        : "- none",
    ].join("\n");

  return [
    "ANNABELLE WORKSPACE",
    list("Canon", workspace.canon),
    list("Locked passages", workspace.lockedPassages),
    list("Scene state", workspace.sceneState),
    list("Unresolved decisions", workspace.unresolvedDecisions),
    `Working delta:\n${workspace.workingDelta ?? "(none)"}`,
  ].join("\n\n");
}

export function addAcousticCorrection(
  state: ArborState,
  correction: string,
): ArborState {
  const clean = correction.trim();

  if (!clean) return state;

  return {
    ...state,
    acousticCorrections: Array.from(
      new Set([
        ...state.acousticCorrections,
        clean,
      ]),
    ).slice(-20),
  };
}
