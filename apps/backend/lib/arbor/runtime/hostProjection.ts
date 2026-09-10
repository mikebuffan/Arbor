import {
  acousticCorrections,
  behaviorCorrections,
} from "./corrections";

import type {
  ArborRuntimeState,
} from "./runtimeState";

import {
  projectHostStartup,
  type OneArborHostState,
} from "../host/oneArborHostBridge";

export function runtimeStateToHostState(
  state: ArborRuntimeState,
): OneArborHostState {
  return {
    schemaVersion: 1,
    sessionId: state.conversationId,
    projectId: state.projectId,
    conversationId: state.conversationId,
    surface: state.channel,
    authority:
      state.activeSubsystem === "annabelle"
        ? "annabelle"
        : "arbor",
    currentGoal: state.currentGoal,
    lastMeaningfulUserTurn:
      state.lastMeaningfulUserTurn,
    lastMeaningfulArborTurn:
      state.lastMeaningfulArborTurn,
    unresolvedWork:
      (state.agency?.unresolvedWork ?? [])
        .map((title, index) => ({
          id: `agency-${index}`,
          title,
          status:
            state.agency?.status === "blocked"
              ? "blocked"
              : "active",
          nextAction: null,
        })),
    corrections:
      state.corrections.map((correction) => ({
        id: correction.id,
        kind:
          correction.kind === "acoustic"
            ? "acoustic"
            : "behavior",
        text: correction.value,
        createdAt: correction.observedAt,
      })),
    behaviorProof: state.behaviorProof,
    updatedAt: state.updatedAt,
  };
}

export function projectRuntimeStartup(
  state: ArborRuntimeState,
) {
  const hostState =
    runtimeStateToHostState(state);

  const startup =
    projectHostStartup(hostState);

  return {
    hostState,
    startup,
    behaviorCorrections:
      behaviorCorrections(
        state.corrections,
      ),
    acousticCorrections:
      acousticCorrections(
        state.corrections,
      ),
  };
}
