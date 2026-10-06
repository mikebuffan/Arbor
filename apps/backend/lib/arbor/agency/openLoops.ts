import type {
  AgencyBlocker,
  AgencyObjectiveState,
  AgencyState,
} from "./engine";

const OPEN_LOOP_PREFIX_V1 = "__arbor_open_loop_v1__:";
const OPEN_LOOP_PREFIX_V2 = "__arbor_open_loop_v2__:";

export type SuspendedAgencyCheckpoint = {
  schemaVersion: 1 | 2;
  id: string;
  goal: string;
  status: "active" | "blocked" | "checkpointed";
  currentStep: number;
  unresolvedWork: string[];
  blocker: AgencyBlocker | null;
  objective?: AgencyObjectiveState;
  suspendedAt: string;
};

function cleanWork(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function isInternalMarker(value: string): boolean {
  return value.startsWith(OPEN_LOOP_PREFIX_V1) ||
    value.startsWith(OPEN_LOOP_PREFIX_V2);
}

export function encodeSuspendedOpenLoop(
  checkpoint: SuspendedAgencyCheckpoint,
): string {
  const value = {
    ...checkpoint,
    schemaVersion: 2 as const,
  };
  return `${OPEN_LOOP_PREFIX_V2}${encodeURIComponent(JSON.stringify(value))}`;
}

export function decodeSuspendedOpenLoop(
  value: string,
): SuspendedAgencyCheckpoint | null {
  const prefix = value.startsWith(OPEN_LOOP_PREFIX_V2)
    ? OPEN_LOOP_PREFIX_V2
    : value.startsWith(OPEN_LOOP_PREFIX_V1)
      ? OPEN_LOOP_PREFIX_V1
      : null;

  if (!prefix) return null;

  try {
    const parsed = JSON.parse(
      decodeURIComponent(value.slice(prefix.length)),
    ) as Partial<SuspendedAgencyCheckpoint>;

    if (
      (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) ||
      typeof parsed.id !== "string" ||
      !parsed.id.trim() ||
      typeof parsed.goal !== "string" ||
      !parsed.goal.trim() ||
      (parsed.status !== "active" &&
        parsed.status !== "blocked" &&
        parsed.status !== "checkpointed") ||
      !Number.isFinite(parsed.currentStep) ||
      !Array.isArray(parsed.unresolvedWork) ||
      !parsed.unresolvedWork.every((item) => typeof item === "string") ||
      typeof parsed.suspendedAt !== "string"
    ) {
      return null;
    }

    return {
      schemaVersion: parsed.schemaVersion,
      id: parsed.id.trim(),
      goal: parsed.goal.trim(),
      status: parsed.status,
      currentStep: Number(parsed.currentStep),
      unresolvedWork: cleanWork(parsed.unresolvedWork),
      blocker: (parsed.blocker as AgencyBlocker | null) ?? null,
      objective: parsed.objective,
      suspendedAt: parsed.suspendedAt,
    };
  } catch {
    return null;
  }
}

export function splitAgencyWork(values: string[]): {
  current: string[];
  suspended: Array<{ marker: string; checkpoint: SuspendedAgencyCheckpoint }>;
} {
  const current: string[] = [];
  const suspended: Array<{ marker: string; checkpoint: SuspendedAgencyCheckpoint }> = [];

  for (const value of cleanWork(values)) {
    const checkpoint = decodeSuspendedOpenLoop(value);
    if (checkpoint) {
      suspended.push({ marker: value, checkpoint });
    } else if (!isInternalMarker(value)) {
      // Corrupt internal payloads are never exposed as model-visible work.
      current.push(value);
    }
  }

  return { current, suspended };
}

function uniqueSuspendedMarkers(markers: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const marker of markers) {
    const checkpoint = decodeSuspendedOpenLoop(marker);
    if (!checkpoint || seen.has(checkpoint.id)) continue;
    seen.add(checkpoint.id);
    result.push(marker);
  }

  return result;
}

export function preserveSuspendedOpenLoops(
  existing: string[],
  incoming: string[],
): string[] {
  const prior = splitAgencyWork(existing);
  const next = splitAgencyWork(incoming);

  return [
    ...next.current,
    ...uniqueSuspendedMarkers([
      ...prior.suspended.map((item) => item.marker),
      ...next.suspended.map((item) => item.marker),
    ]),
  ];
}

export function suspendAgencyIntoWork(
  foregroundWork: string[],
  prior: AgencyState,
  options: { id?: string; suspendedAt?: string } = {},
): string[] {
  if (
    prior.status !== "active" &&
    prior.status !== "blocked" &&
    prior.status !== "checkpointed"
  ) {
    return cleanWork(foregroundWork);
  }

  const priorWork = splitAgencyWork(prior.unresolvedWork);
  const checkpoint: SuspendedAgencyCheckpoint = {
    schemaVersion: 2,
    id: options.id ?? `open-loop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    goal: prior.goal.trim(),
    status: prior.status,
    currentStep: prior.currentStep,
    unresolvedWork: priorWork.current.length
      ? priorWork.current
      : [`complete goal: ${prior.goal}`],
    blocker: prior.blocker ?? null,
    objective: prior.objective,
    suspendedAt: options.suspendedAt ?? new Date().toISOString(),
  };

  return [
    ...cleanWork(foregroundWork),
    ...priorWork.suspended.map((item) => item.marker),
    encodeSuspendedOpenLoop(checkpoint),
  ];
}

export function restoreMostRecentOpenLoop(
  current: AgencyState,
): AgencyState | null {
  const work = splitAgencyWork(current.unresolvedWork);
  const latest = work.suspended.length
    ? work.suspended[work.suspended.length - 1]
    : null;

  if (!latest) return null;

  const remaining = work.suspended
    .slice(0, -1)
    .map((item) => item.marker);

  return {
    ...current,
    goal: latest.checkpoint.goal,
    status: latest.checkpoint.status,
    currentStep: latest.checkpoint.currentStep,
    unresolvedWork: [
      ...latest.checkpoint.unresolvedWork,
      ...remaining,
    ],
    blocker:
      latest.checkpoint.status === "blocked"
        ? latest.checkpoint.blocker
        : null,
    objective: latest.checkpoint.objective,
  };
}

export function projectAgencyWorkForPrompt(values: string[]): string[] {
  const work = splitAgencyWork(values);
  return [
    ...work.current,
    ...work.suspended.map(({ checkpoint }) => {
      const next = checkpoint.unresolvedWork[0]?.trim();
      return next
        ? `background open loop: ${checkpoint.goal} | next: ${next}`
        : `background open loop: ${checkpoint.goal}`;
    }),
  ];
}
