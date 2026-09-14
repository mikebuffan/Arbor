import type {
  AgencyBlocker,
  AgencyState,
} from "./engine";

const OPEN_LOOP_PREFIX =
  "__arbor_open_loop_v1__:";

export type SuspendedAgencyCheckpoint = {
  schemaVersion: 1;
  id: string;
  goal: string;
  status: "active" | "blocked";
  currentStep: number;
  unresolvedWork: string[];
  blocker: AgencyBlocker | null;
  suspendedAt: string;
};

function cleanWork(
  values: string[],
): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

export function encodeSuspendedOpenLoop(
  checkpoint: SuspendedAgencyCheckpoint,
): string {
  return `${OPEN_LOOP_PREFIX}${encodeURIComponent(
    JSON.stringify(checkpoint),
  )}`;
}

export function decodeSuspendedOpenLoop(
  value: string,
): SuspendedAgencyCheckpoint | null {
  if (!value.startsWith(OPEN_LOOP_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      decodeURIComponent(
        value.slice(OPEN_LOOP_PREFIX.length),
      ),
    ) as Partial<SuspendedAgencyCheckpoint>;

    if (
      parsed.schemaVersion !== 1 ||
      typeof parsed.id !== "string" ||
      !parsed.id.trim() ||
      typeof parsed.goal !== "string" ||
      !parsed.goal.trim() ||
      (parsed.status !== "active" &&
        parsed.status !== "blocked") ||
      !Number.isFinite(parsed.currentStep) ||
      !Array.isArray(parsed.unresolvedWork) ||
      !parsed.unresolvedWork.every(
        (item) => typeof item === "string",
      ) ||
      typeof parsed.suspendedAt !== "string"
    ) {
      return null;
    }

    return {
      schemaVersion: 1,
      id: parsed.id.trim(),
      goal: parsed.goal.trim(),
      status: parsed.status,
      currentStep: Number(parsed.currentStep),
      unresolvedWork: cleanWork(
        parsed.unresolvedWork,
      ),
      blocker:
        (parsed.blocker as AgencyBlocker | null) ??
        null,
      suspendedAt: parsed.suspendedAt,
    };
  } catch {
    return null;
  }
}

export function splitAgencyWork(
  values: string[],
): {
  current: string[];
  suspended: Array<{
    marker: string;
    checkpoint: SuspendedAgencyCheckpoint;
  }>;
} {
  const current: string[] = [];
  const suspended: Array<{
    marker: string;
    checkpoint: SuspendedAgencyCheckpoint;
  }> = [];

  for (const value of cleanWork(values)) {
    const checkpoint =
      decodeSuspendedOpenLoop(value);

    if (checkpoint) {
      suspended.push({
        marker: value,
        checkpoint,
      });
    } else {
      current.push(value);
    }
  }

  return { current, suspended };
}

function uniqueSuspendedMarkers(
  markers: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const marker of markers) {
    const checkpoint =
      decodeSuspendedOpenLoop(marker);

    if (!checkpoint || seen.has(checkpoint.id)) {
      continue;
    }

    seen.add(checkpoint.id);
    result.push(marker);
  }

  return result;
}

/**
 * Replaces the foreground work for the current goal while preserving every
 * suspended background open loop. Progress hooks can therefore report a new
 * current step without accidentally deleting sibling unfinished objectives.
 */
export function preserveSuspendedOpenLoops(
  existing: string[],
  incoming: string[],
): string[] {
  const prior = splitAgencyWork(existing);
  const next = splitAgencyWork(incoming);

  return [
    ...next.current,
    ...uniqueSuspendedMarkers([
      ...prior.suspended.map(
        (item) => item.marker,
      ),
      ...next.suspended.map(
        (item) => item.marker,
      ),
    ]),
  ];
}

export function suspendAgencyIntoWork(
  foregroundWork: string[],
  prior: AgencyState,
  options: {
    id?: string;
    suspendedAt?: string;
  } = {},
): string[] {
  if (
    prior.status !== "active" &&
    prior.status !== "blocked"
  ) {
    return cleanWork(foregroundWork);
  }

  const priorWork =
    splitAgencyWork(prior.unresolvedWork);

  const checkpoint: SuspendedAgencyCheckpoint = {
    schemaVersion: 1,
    id:
      options.id ??
      `open-loop-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    goal: prior.goal.trim(),
    status: prior.status,
    currentStep: prior.currentStep,
    unresolvedWork:
      priorWork.current.length
        ? priorWork.current
        : [`complete goal: ${prior.goal}`],
    blocker: prior.blocker ?? null,
    suspendedAt:
      options.suspendedAt ??
      new Date().toISOString(),
  };

  return [
    ...cleanWork(foregroundWork),
    ...priorWork.suspended.map(
      (item) => item.marker,
    ),
    encodeSuspendedOpenLoop(checkpoint),
  ];
}

/**
 * Pop the most recently suspended foreground goal. Older open loops remain
 * attached, giving interruptions stack semantics: C completes -> B resumes ->
 * A resumes. The newest strategy/correction evidence stays on the live state.
 */
export function restoreMostRecentOpenLoop(
  current: AgencyState,
): AgencyState | null {
  const work =
    splitAgencyWork(current.unresolvedWork);

  const latest =
    work.suspended.at(-1);

  if (!latest) {
    return null;
  }

  const remaining =
    work.suspended
      .slice(0, -1)
      .map((item) => item.marker);

  return {
    ...current,
    goal: latest.checkpoint.goal,
    status: latest.checkpoint.status,
    currentStep:
      latest.checkpoint.currentStep,
    unresolvedWork: [
      ...latest.checkpoint.unresolvedWork,
      ...remaining,
    ],
    blocker:
      latest.checkpoint.status === "blocked"
        ? latest.checkpoint.blocker
        : null,
  };
}

/**
 * Never inject opaque checkpoint payloads into the model prompt. Project them
 * as ordinary human-readable background open loops instead.
 */
export function projectAgencyWorkForPrompt(
  values: string[],
): string[] {
  const work = splitAgencyWork(values);

  return [
    ...work.current,
    ...work.suspended.map(
      ({ checkpoint }) => {
        const next =
          checkpoint.unresolvedWork[0]?.trim();

        return next
          ? `background open loop: ${checkpoint.goal} | next: ${next}`
          : `background open loop: ${checkpoint.goal}`;
      },
    ),
  ];
}
