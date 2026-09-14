export interface ArborRecoveryRouteStats {
  routeId: string;
  attempts: number;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  lastOutcome: "success" | "failure" | null;
}

export interface ArborRecoveryRouteLearningStore {
  get(routeId: string): Promise<ArborRecoveryRouteStats>;
  recordSuccess(routeId: string): Promise<void>;
  recordFailure(routeId: string): Promise<void>;
  snapshot(): Promise<ArborRecoveryRouteStats[]>;
  replaceAll(stats: ArborRecoveryRouteStats[]): Promise<void>;
}

function emptyStats(routeId: string): ArborRecoveryRouteStats {
  return {
    routeId,
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    lastOutcome: null,
  };
}

export class InMemoryArborRecoveryRouteLearningStore
  implements ArborRecoveryRouteLearningStore {
  private readonly stats = new Map<string, ArborRecoveryRouteStats>();

  async get(routeId: string): Promise<ArborRecoveryRouteStats> {
    return structuredClone(this.stats.get(routeId) ?? emptyStats(routeId));
  }

  async recordSuccess(routeId: string): Promise<void> {
    const current = await this.get(routeId);
    this.stats.set(routeId, {
      ...current,
      attempts: current.attempts + 1,
      successes: current.successes + 1,
      consecutiveFailures: 0,
      lastOutcome: "success",
    });
  }

  async recordFailure(routeId: string): Promise<void> {
    const current = await this.get(routeId);
    this.stats.set(routeId, {
      ...current,
      attempts: current.attempts + 1,
      failures: current.failures + 1,
      consecutiveFailures: current.consecutiveFailures + 1,
      lastOutcome: "failure",
    });
  }

  async snapshot(): Promise<ArborRecoveryRouteStats[]> {
    return [...this.stats.values()].map((item) => structuredClone(item));
  }

  async replaceAll(stats: ArborRecoveryRouteStats[]): Promise<void> {
    this.stats.clear();
    for (const item of stats) {
      this.stats.set(item.routeId, structuredClone(item));
    }
  }
}

export function learnedRouteScore(input: {
  baseConfidence: number;
  stats: ArborRecoveryRouteStats;
}) {
  const { baseConfidence, stats } = input;

  if (stats.attempts === 0) {
    return baseConfidence;
  }

  const successRate = stats.successes / stats.attempts;
  const reliabilityAdjustment = (successRate - 0.5) * 0.3;
  const repeatedFailurePenalty = Math.min(
    0.45,
    stats.consecutiveFailures * 0.15,
  );

  return Math.max(
    0,
    Math.min(
      1,
      baseConfidence + reliabilityAdjustment - repeatedFailurePenalty,
    ),
  );
}

export function normalizeArborRecoveryRouteStats(
  raw: unknown,
): ArborRecoveryRouteStats[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: ArborRecoveryRouteStats[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<ArborRecoveryRouteStats>;

    if (
      typeof candidate.routeId !== "string" ||
      candidate.routeId.trim().length === 0 ||
      seen.has(candidate.routeId)
    ) {
      continue;
    }

    const attempts =
      Number.isInteger(candidate.attempts) && (candidate.attempts ?? -1) >= 0
        ? (candidate.attempts as number)
        : 0;

    const successes =
      Number.isInteger(candidate.successes) && (candidate.successes ?? -1) >= 0
        ? Math.min(candidate.successes as number, attempts)
        : 0;

    const failures =
      Number.isInteger(candidate.failures) && (candidate.failures ?? -1) >= 0
        ? Math.min(candidate.failures as number, attempts)
        : 0;

    const consecutiveFailures =
      Number.isInteger(candidate.consecutiveFailures) &&
      (candidate.consecutiveFailures ?? -1) >= 0
        ? Math.min(candidate.consecutiveFailures as number, failures)
        : 0;

    const lastOutcome =
      candidate.lastOutcome === "success" || candidate.lastOutcome === "failure"
        ? candidate.lastOutcome
        : null;

    seen.add(candidate.routeId);

    normalized.push({
      routeId: candidate.routeId,
      attempts,
      successes,
      failures,
      consecutiveFailures,
      lastOutcome,
    });
  }

  return normalized;
}
