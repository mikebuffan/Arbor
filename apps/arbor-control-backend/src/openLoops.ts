import type {
  ArborState,
} from "./types.js";

const OPEN_LOOP_PREFIX =
  "__arbor_control_open_loop_v1__:";

export type SuspendedArborCheckpoint = {
  schemaVersion: 1;
  id: string;
  goal: string;
  unresolvedWork: string[];
  suspendedAt: string;
};

function clean(
  values: string[],
): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

export function encodeSuspendedOpenLoop(
  checkpoint: SuspendedArborCheckpoint,
): string {
  return `${OPEN_LOOP_PREFIX}${encodeURIComponent(
    JSON.stringify(checkpoint),
  )}`;
}

export function decodeSuspendedOpenLoop(
  value: string,
): SuspendedArborCheckpoint | null {
  if (!value.startsWith(OPEN_LOOP_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      decodeURIComponent(
        value.slice(OPEN_LOOP_PREFIX.length),
      ),
    ) as Partial<SuspendedArborCheckpoint>;

    if (
      parsed.schemaVersion !== 1 ||
      typeof parsed.id !== "string" ||
      !parsed.id.trim() ||
      typeof parsed.goal !== "string" ||
      !parsed.goal.trim() ||
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
      unresolvedWork: clean(
        parsed.unresolvedWork,
      ),
      suspendedAt: parsed.suspendedAt,
    };
  } catch {
    return null;
  }
}

export function splitOpenLoopWork(
  values: string[],
): {
  current: string[];
  suspended: Array<{
    marker: string;
    checkpoint: SuspendedArborCheckpoint;
  }>;
} {
  const current: string[] = [];
  const suspended: Array<{
    marker: string;
    checkpoint: SuspendedArborCheckpoint;
  }> = [];

  for (const value of clean(values)) {
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

  return {
    current,
    suspended,
  };
}

function uniqueMarkers(
  markers: string[],
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const marker of markers) {
    const checkpoint =
      decodeSuspendedOpenLoop(marker);

    if (!checkpoint || seen.has(checkpoint.id)) {
      continue;
    }

    seen.add(checkpoint.id);
    output.push(marker);
  }

  return output;
}

/** Keep host-owned suspended work when model/provider progress replaces the foreground list. */
export function preserveSuspendedOpenLoops(
  existing: string[],
  incoming: string[],
): string[] {
  const prior = splitOpenLoopWork(existing);
  const next = splitOpenLoopWork(incoming);

  return [
    ...next.current,
    ...uniqueMarkers([
      ...prior.suspended.map(
        (entry) => entry.marker,
      ),
      ...next.suspended.map(
        (entry) => entry.marker,
      ),
    ]),
  ];
}

/**
 * Turn a live objective into a durable background checkpoint while a genuinely
 * unrelated foreground turn is answered. Explicit supersession is handled by
 * the caller and must not use this function.
 */
export function suspendStateIntoWork(
  foregroundWork: string[],
  prior: ArborState,
  options: {
    id?: string;
    suspendedAt?: string;
  } = {},
): string[] {
  if (!prior.goal?.trim() || !prior.unresolvedWork.length) {
    return clean(foregroundWork);
  }

  const priorWork =
    splitOpenLoopWork(
      prior.unresolvedWork,
    );

  const checkpoint: SuspendedArborCheckpoint = {
    schemaVersion: 1,
    id:
      options.id ??
      `control-open-loop-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    goal: prior.goal.trim(),
    unresolvedWork:
      priorWork.current.length
        ? priorWork.current
        : [`continue goal: ${prior.goal}`],
    suspendedAt:
      options.suspendedAt ??
      new Date().toISOString(),
  };

  return [
    ...clean(foregroundWork),
    ...priorWork.suspended.map(
      (entry) => entry.marker,
    ),
    encodeSuspendedOpenLoop(checkpoint),
  ];
}

/** Pop only the newest interruption. Older checkpoints stay attached. */
export function restoreMostRecentOpenLoop(
  current: ArborState,
): ArborState | null {
  const work =
    splitOpenLoopWork(
      current.unresolvedWork,
    );

  const latest =
    work.suspended.at(-1);

  if (!latest) {
    return null;
  }

  return {
    ...current,
    goal:
      latest.checkpoint.goal,
    unresolvedWork: [
      ...latest.checkpoint.unresolvedWork,
      ...work.suspended
        .slice(0, -1)
        .map(
          (entry) => entry.marker,
        ),
    ],
  };
}

/** Never expose serialized checkpoint payloads to the provider/model. */
export function projectOpenLoopWorkForPrompt(
  values: string[],
): string[] {
  const work =
    splitOpenLoopWork(values);

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
