import type {
  ArborToolRoute,
} from "./toolExecution.js";

function looksLikeToolFailure(
  blockerKind: string,
  blockerMessage: string,
) {
  return (
    blockerKind === "tool_failure" ||
    blockerKind === "host_failure" ||
    blockerKind === "unknown" ||
    /\btool\b|command|process|exit code/i.test(
      blockerMessage,
    )
  );
}

export function transientToolRetryRoute<T>(input: {
  id?: string;
  description?: string;
  execute: () => Promise<T>;
}): ArborToolRoute<T> {
  return {
    id:
      input.id ??
      "retry-transient-tool-once",
    description:
      input.description ??
      "Retry the same tool action once after a transient execution failure.",
    confidence: 0.99,
    requiresUserInput: false,
    preservesGoal: true,
    applicable(
      blockerKind,
      blockerMessage,
    ) {
      return (
        looksLikeToolFailure(
          blockerKind,
          blockerMessage,
        ) &&
        /timeout|temporar|busy|locked|reset|disconnect|unavailable|network|socket|transport|429|502|503|504/i.test(
          blockerMessage,
        )
      );
    },
    execute: input.execute,
  };
}

export function alternateCompatibleToolRoute<T>(input: {
  id: string;
  description: string;
  execute: () => Promise<T>;
}): ArborToolRoute<T> {
  return {
    id: input.id,
    description: input.description,
    confidence: 0.95,
    requiresUserInput: false,
    preservesGoal: true,
    applicable(
      blockerKind,
      blockerMessage,
    ) {
      return (
        blockerKind === "missing_capability" ||
        blockerKind === "validation_failure" ||
        looksLikeToolFailure(
          blockerKind,
          blockerMessage,
        ) ||
        /ARBOR_TOOL_RESULT_VERIFICATION_FAILED|unsupported|not supported|capability unavailable|missing capability/i.test(
          blockerMessage,
        )
      );
    },
    execute: input.execute,
  };
}

export function capabilityFallbackRoute<T>(input: {
  id: string;
  description: string;
  execute: () => Promise<T>;
}): ArborToolRoute<T> {
  return alternateCompatibleToolRoute(input);
}

export function authorizationRequiredRoute<T>(input: {
  id?: string;
  description?: string;
  requiredUserInput?: string;
}): ArborToolRoute<T> {
  return {
    id:
      input.id ??
      "tool-authorization-required",
    description:
      input.description ??
      "Resume the tool action after authorization is available.",
    confidence: 0.99,
    requiresUserInput: true,
    requiredUserInput:
      input.requiredUserInput ??
      "Authorize or reconnect the required tool.",
    preservesGoal: true,
    applicable(
      blockerKind,
      blockerMessage,
    ) {
      return (
        blockerKind === "permission" ||
        /401|403|unauthori[sz]ed|forbidden|credential|token|login|auth|permission|reconnect/i.test(
          blockerMessage,
        )
      );
    },
    async execute() {
      throw new Error(
        "ARBOR_USER_INPUT_ROUTE_EXECUTED_DIRECTLY",
      );
    },
  };
}
