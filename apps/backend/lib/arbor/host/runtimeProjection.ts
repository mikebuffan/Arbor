import type {
  ArborBehaviorProof,
} from "../behavior/behaviorProjection";

import type {
  ArborContinuityState,
} from "../continuity/state";

import type {
  ArborSubsystem,
} from "../runtime/arborRuntime";

import {
  projectHostStartup,
  type OneArborHostState,
} from "./oneArborHostBridge";

export function buildHostStateFromRuntime(
  input: {
    sessionId: string;
    projectId: string;
    conversationId:
      | string
      | null;
    continuity:
      ArborContinuityState;
    activeSubsystem:
      ArborSubsystem;
    acousticCorrections:
      string[];
    behavioralCorrections:
      string[];
    behaviorProof:
      ArborBehaviorProof | null;
    updatedAt: string;
  },
): OneArborHostState {
  return {
    schemaVersion: 1,
    sessionId:
      input.sessionId,
    projectId:
      input.projectId,
    conversationId:
      input.conversationId,
    surface:
      input.continuity.channel,
    authority:
      input.activeSubsystem ===
      "annabelle"
        ? "annabelle"
        : "arbor",
    currentGoal:
      input.continuity.currentGoal,
    lastMeaningfulUserTurn:
      input.continuity
        .lastMeaningfulUserTurn,
    lastMeaningfulArborTurn:
      input.continuity
        .lastMeaningfulArborTurn,
    unresolvedWork:
      input.continuity
        .unresolvedWork
        .map(
          (work, index) => ({
            id:
              `runtime-work-${index}`,
            title:
              work,
            status:
              "active" as const,
            nextAction:
              null,
          }),
        ),
    corrections: [
      ...input
        .behavioralCorrections
        .map(
          (text, index) => ({
            id:
              `behavior-${index}`,
            kind:
              "behavior" as const,
            text,
            createdAt:
              input.updatedAt,
          }),
        ),
      ...input
        .acousticCorrections
        .map(
          (text, index) => ({
            id:
              `acoustic-${index}`,
            kind:
              "acoustic" as const,
            text,
            createdAt:
              input.updatedAt,
          }),
        ),
    ],
    behaviorProof:
      input.behaviorProof,
    updatedAt:
      input.updatedAt,
  };
}

export function projectRuntimeHost(
  input: Parameters<
    typeof buildHostStateFromRuntime
  >[0],
) {
  const state =
    buildHostStateFromRuntime(
      input,
    );

  return {
    state,
    startup:
      projectHostStartup(
        state,
      ),
  };
}
