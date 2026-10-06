export type AgencyContinuationDisposition =
  | { returnToUser: true; reason: "complete" | "human_boundary" }
  | { returnToUser: false; reason: "continue_now" | "resume_durable_work" };

/**
 * One Arbor continuation contract.
 *
 * A checkpoint is storage, not permission to stop. User-visible control returns
 * only when the parent goal is verified complete or a genuine human/protected
 * boundary exists. Intermediate success, tool failure, execution ceilings and
 * durable ARK ownership remain continuation states.
 */
export function agencyContinuationDisposition(input: {
  status: "active" | "complete" | "blocked" | "checkpointed";
  unresolvedWork: string[];
  blocker?: string | null;
}): AgencyContinuationDisposition {
  if (input.status === "complete" && input.unresolvedWork.length === 0) {
    return { returnToUser: true, reason: "complete" };
  }
  if (input.status === "blocked" && input.blocker) {
    return { returnToUser: true, reason: "human_boundary" };
  }
  if (input.status === "checkpointed") {
    return { returnToUser: false, reason: "resume_durable_work" };
  }
  return { returnToUser: false, reason: "continue_now" };
}

export const ONE_ARB0R_CONTINUATION_REQUIREMENTS = [
  "Do not ask the user to say go when remaining work is safe, reversible, authorized and in scope.",
  "Do not treat a successful intermediate action as completion.",
  "Do not treat a checkpoint or execution ceiling as permission to emit a final user response.",
  "Persist unresolved work before yielding for a genuine human boundary.",
  "When ARK owns unfinished work, resume that durable objective before starting a competing action.",
  "Verify the parent goal, not merely the most recent tool call, before claiming completion.",
] as const;
