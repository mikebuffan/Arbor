import type {
  ArborState,
  SuspendedOpenLoopState,
} from "./types.js";

function clean(
  values: string[],
): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueCheckpoints(
  values: SuspendedOpenLoopState[],
): SuspendedOpenLoopState[] {
  const seen = new Set<string>();
  const output: SuspendedOpenLoopState[] = [];

  for (const value of values) {
    const id = value.id.trim();
    const goal = value.goal.trim();

    if (!id || !goal || seen.has(id)) {
      continue;
    }

    seen.add(id);
    output.push({
      id,
      goal,
      unresolvedWork: clean(
        value.unresolvedWork,
      ),
      suspendedAt: value.suspendedAt,
    });
  }

  return output;
}

export function suspendedOpenLoops(
  state: ArborState,
): SuspendedOpenLoopState[] {
  return uniqueCheckpoints(
    state.suspendedOpenLoops ?? [],
  );
}

/**
 * Start a genuinely unrelated foreground turn while preserving the prior live
 * objective as host-owned structured state. The checkpoint never has to appear
 * in model prompt text, so the foreground answer stays clean and task-specific.
 */
export function suspendForForeground(
  state: ArborState,
  foregroundGoal: string,
  options: {
    id?: string;
    suspendedAt?: string;
  } = {},
): ArborState {
  const priorGoal = state.goal?.trim();
  const foreground = foregroundGoal.trim();

  if (!priorGoal || !state.unresolvedWork.length || !foreground) {
    return {
      ...state,
      goal: foreground || state.goal,
      unresolvedWork:
        foreground
          ? [`complete goal: ${foreground}`]
          : state.unresolvedWork,
    };
  }

  const checkpoint: SuspendedOpenLoopState = {
    id:
      options.id ??
      `control-open-loop-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    goal: priorGoal,
    unresolvedWork:
      clean(state.unresolvedWork).length
        ? clean(state.unresolvedWork)
        : [`continue goal: ${priorGoal}`],
    suspendedAt:
      options.suspendedAt ??
      new Date().toISOString(),
  };

  return {
    ...state,
    goal: foreground,
    unresolvedWork: [
      `complete goal: ${foreground}`,
    ],
    suspendedOpenLoops:
      uniqueCheckpoints([
        ...(state.suspendedOpenLoops ?? []),
        checkpoint,
      ]),
  };
}

/** Explicit supersession cancels the old stack rather than resurrecting it. */
export function supersedeForeground(
  state: ArborState,
  foregroundGoal: string,
): ArborState {
  const goal = foregroundGoal.trim();

  return {
    ...state,
    goal,
    unresolvedWork:
      goal
        ? [`complete goal: ${goal}`]
        : [],
    suspendedOpenLoops: [],
  };
}

/**
 * Restore one interrupted objective only after the current foreground objective
 * has actually completed. Nested interruptions unwind LIFO.
 */
export function restoreMostRecentOpenLoop(
  state: ArborState,
): ArborState {
  const loops = suspendedOpenLoops(state);
  const latest = loops.at(-1);

  if (!latest) {
    return state;
  }

  return {
    ...state,
    goal: latest.goal,
    unresolvedWork:
      latest.unresolvedWork.length
        ? [...latest.unresolvedWork]
        : [`continue goal: ${latest.goal}`],
    suspendedOpenLoops:
      loops.slice(0, -1),
  };
}

/**
 * Host-boundary normalization. Provider/model output may replace foreground
 * unresolvedWork, but it never owns the suspended stack. Completion is the
 * signal to pop exactly one checkpoint back into the foreground.
 */
export function reconcileOpenLoopsAfterAgency(
  before: ArborState,
  after: ArborState,
): ArborState {
  const loops =
    uniqueCheckpoints([
      ...(before.suspendedOpenLoops ?? []),
      ...(after.suspendedOpenLoops ?? []),
    ]);

  const merged: ArborState = {
    ...after,
    suspendedOpenLoops: loops,
  };

  if (
    merged.unresolvedWork.length === 0 &&
    loops.length > 0
  ) {
    return restoreMostRecentOpenLoop(
      merged,
    );
  }

  return merged;
}

export function projectBackgroundOpenLoops(
  state: ArborState,
): string[] {
  return suspendedOpenLoops(state).map(
    (checkpoint) => {
      const next =
        checkpoint.unresolvedWork[0]?.trim();

      return next
        ? `background open loop: ${checkpoint.goal} | next: ${next}`
        : `background open loop: ${checkpoint.goal}`;
    },
  );
}
