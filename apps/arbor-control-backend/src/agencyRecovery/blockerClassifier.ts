import type {
  ArborBlocker,
  ArborBlockerKind,
} from "./types.js";

function classifyKind(error: unknown): ArborBlockerKind {
  const text = String(error).toLowerCase();

  if (/permission|eacces|eperm|read-only|readonly/.test(text)) {
    return "permission";
  }

  if (/not supported|unsupported|missing capability|unavailable capability/.test(text)) {
    return "missing_capability";
  }

  if (/missing information|insufficient information|unknown required/.test(text)) {
    return "missing_information";
  }

  if (/conflict|cas|compare.and.swap|version mismatch/.test(text)) {
    return "conflict";
  }

  if (/invalid|validation|invariant/.test(text)) {
    return "validation_failure";
  }

  if (/host|provider|generation|model|timeout|temporar/.test(text)) {
    return "host_failure";
  }

  if (/state|checkpoint|continuity|repository/.test(text)) {
    return "state_failure";
  }

  if (/tool|command|process|exit code/.test(text)) {
    return "tool_failure";
  }

  return "unknown";
}

function defaultRecoverable(kind: ArborBlockerKind): boolean {
  return (
    kind === "permission" ||
    kind === "missing_capability" ||
    kind === "conflict" ||
    kind === "tool_failure" ||
    kind === "host_failure" ||
    kind === "state_failure" ||
    kind === "unknown"
  );
}

export function classifyArborBlocker(input: {
  id: string;
  error: unknown;
  failedAction: string;
  goal: string;
  evidence?: string[];
  recoverable?: boolean;
}): ArborBlocker {
  const kind = classifyKind(input.error);

  return {
    id: input.id,
    kind,
    message: String(input.error),
    failedAction: input.failedAction,
    goal: input.goal,
    recoverable: input.recoverable ?? defaultRecoverable(kind),
    evidence: [
      ...(input.evidence ?? []),
      `BLOCKER_KIND:${kind}`,
      `FAILED_ACTION:${input.failedAction}`,
    ],
    createdAt: new Date().toISOString(),
  };
}
