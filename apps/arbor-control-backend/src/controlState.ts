import type { ArborState } from "./types.js";

export type AnnabelleWorkspace = {
  canon: string[];
  lockedPassages: string[];
  sceneState: string[];
  unresolvedDecisions: string[];
  workingDelta: string | null;
};

export type AnnabelleWorkspaceRevision = {
  id: string;
  createdAt: string;
  reason: string;
  workspace: AnnabelleWorkspace;
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
  return structuredClone(
    state.annabelle ?? EMPTY_ANNABELLE_WORKSPACE,
  );
}

export function renderAnnabelleWorkspace(
  state: ArborState,
): string {
  const workspace = annabelleWorkspace(state);

  const list = (
    name: string,
    values: string[],
  ) =>
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

export function pushAnnabelleRevision(
  state: ArborState,
  reason: string,
): ArborState {
  const revision: AnnabelleWorkspaceRevision = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason: reason.trim() || "annabelle workspace update",
    workspace: annabelleWorkspace(state),
  };

  return {
    ...state,
    annabelleRevisions: [
      ...(state.annabelleRevisions ?? []),
      revision,
    ].slice(-50),
  };
}

export function restoreLatestAnnabelleRevision(
  state: ArborState,
): ArborState {
  const revisions = state.annabelleRevisions ?? [];
  const latest = revisions.at(-1);

  if (!latest) {
    throw new Error("annabelle_revision_not_found");
  }

  return {
    ...state,
    annabelle: structuredClone(latest.workspace),
    annabelleRevisions: revisions.slice(0, -1),
  };
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
