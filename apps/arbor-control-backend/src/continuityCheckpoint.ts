import type {
  AgencyResult,
} from "./agency.js";
import {
  rankUnresolvedWork,
} from "./longitudinalPolicy.js";
import type {
  ArborState,
  ContinuityCheckpoint,
} from "./types.js";

export function buildContinuityCheckpoint(input: {
  state: ArborState;
  agency: AgencyResult;
  createdAt: string;
}): ContinuityCheckpoint {
  const unresolvedWork =
    rankUnresolvedWork(
      input.state.unresolvedWork,
    );

  const exactNextWork =
    unresolvedWork[0] ??
    null;

  const status =
    input.agency.status ===
    "blocked"
      ? "blocked"
      : unresolvedWork.length
        ? "active"
        : "complete";

  const blockerReason =
    input.agency.status ===
    "blocked"
      ? input.agency.blocker
      : null;

  return {
    goal:
      input.state.goal,

    status,

    exactNextWork,

    blockerReason,

    continueWithoutPrompt:
      status ===
      "active",

    unresolvedWork,

    behavioralCorrections:
      [
        ...(
          input.state
            .behavioralCorrections ??
          []
        ),
      ],

    createdAt:
      input.createdAt,
  };
}

export function checkpointProjection(
  checkpoint:
    ContinuityCheckpoint |
    undefined,
): string {
  if (!checkpoint) {
    return "";
  }

  return [
    "CONTINUITY CHECKPOINT:",
    `- goal: ${checkpoint.goal ?? "none"}`,
    `- status: ${checkpoint.status}`,
    `- exact next work: ${checkpoint.exactNextWork ?? "none"}`,
    `- blocker: ${checkpoint.blockerReason ?? "none"}`,
    `- continue without prompt: ${checkpoint.continueWithoutPrompt ? "yes" : "no"}`,
  ].join("\n");
}
